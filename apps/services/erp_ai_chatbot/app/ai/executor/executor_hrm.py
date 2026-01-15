from __future__ import annotations
import re
from typing import Any, Dict, Optional, List
from datetime import datetime
from zoneinfo import ZoneInfo
from app.core.rbac import check_role
from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError
from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec
from app.ai.answer_composer import compose_answer_with_llm, compose_safe_enough

from app.db.hrm_database import HrmSessionLocal
from app.ai.paraphraser import paraphrase_answer

import json
import os
from dotenv import load_dotenv
from google import genai

from app.ai.executor.context_injection import inject_auth_into_args

def _args_has_target_user_id_field(tool) -> bool:
    # tool.args_model là Pydantic model class
    m = getattr(tool, "args_model", None)
    fields = getattr(m, "model_fields", None)
    return bool(fields) and ("target_user_id" in fields)


load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_COMPOSE_MODEL = os.getenv("GEMINI_COMPOSE_MODEL", os.getenv("GEMINI_MODEL_1", "gemini-2.5-flash"))
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

# Fix để câu trả lời chỉ bám câu hỏi (không lôi thông tin NV)
# Tool chỉ để lấy context (không nên đưa vào câu trả lời cuối)
CONTEXT_ONLY_TOOLS_BY_MODULE: dict[str, set[str]] = {
    "hrm": {"tim_nhan_vien", "thong_tin_nhan_vien"},
}

_EMP_PROFILE_KW = re.compile(
    r"(thông tin|hồ sơ|profile|liên hệ|sđt|điện thoại|email|phòng ban|chức vụ|ngày vào|ngày nghỉ|trạng thái)",
    re.IGNORECASE
)

def _wants_employee_profile(message: str) -> bool:
    return bool(_EMP_PROFILE_KW.search(message or ""))

def _filter_step_infos_for_compose(module: str, message: str, step_infos: list[dict]) -> list[dict]:
    suppress = CONTEXT_ONLY_TOOLS_BY_MODULE.get(module, set())
    if module == "hrm" and not _wants_employee_profile(message):
        # bỏ các tool chỉ để lấy context nhân viên khỏi payload gửi LLM
        return [si for si in step_infos if si.get("tool") not in suppress]
    return step_infos

def _filter_step_infos_for_answer(module: str, message: str, step_infos: list[dict]) -> list[dict]:
    suppress = CONTEXT_ONLY_TOOLS_BY_MODULE.get(module, set())
    if module == "hrm" and (not _wants_employee_profile(message)):
        return [x for x in step_infos if x.get("tool") not in suppress]
    return step_infos

def _extract_requested_metrics(message: str) -> list[str]:
    m = (message or "").lower()
    metrics: list[str] = []

    # chấm công/tháng
    if "đi muộn" in m or "di muon" in m or "late" in m:
        metrics.append("late_minutes")
    if "về sớm" in m or "ve som" in m or "early" in m:
        metrics.append("early_leave_minutes")
    if "ot" in m or "làm thêm" in m or "lam them" in m:
        metrics.append("ot_hours")
    if "đi làm" in m or "di lam" in m or "present" in m or "công" in m:
        metrics.append("present_days")
    if "vắng" in m or "vang" in m or "absent" in m:
        metrics.append("absent_days")
    if "nghỉ" in m or "nghi" in m or "leave" in m:
        metrics.append("leave_days")

    # nghỉ phép
    if "đơn nghỉ" in m or "nghỉ phép" in m or "don nghi" in m:
        # list fields (không phải metrics)
        metrics.append("leave_list_compact")

    return metrics

_EMP_CODE_RE = re.compile(r"^[A-Za-z]{1,10}\d{1,10}$")  # ví dụ NV001

def _is_int_like(s: str) -> bool:
    s = (s or "").strip()
    return s.isdigit()

def _auto_resolve_hrm_employee_id(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Nếu args.employee_id đang là mã NV (VD: 'NV001') thay vì int,
    thì tự gọi tool 'thong_tin_nhan_vien' (fallback 'tim_nhan_vien') để lấy employee_id int.
    Chỉ chạy khi employee_id là string không phải số.
    """
    if "employee_id" not in args:
        return args

    v = args.get("employee_id")
    if not isinstance(v, str):
        return args

    raw = v.strip()
    if not raw or _is_int_like(raw):
        return args

    # chỉ xử lý nếu giống mã NV/EMP code
    if not _EMP_CODE_RE.fullmatch(raw):
        return args

    # gọi tool lookup nhân viên để lấy employee_id
    tool = get_tool("hrm", "thong_tin_nhan_vien") or get_tool("hrm", "tim_nhan_vien")
    if not tool:
        return args

    lookup_args = {"employee_code": raw} if tool.name == "thong_tin_nhan_vien" else {"tu_khoa": raw}
    lookup_res = _execute_tool("hrm", tool, lookup_args)

    data = (lookup_res or {}).get("data") if isinstance(lookup_res, dict) else None
    emp_id = data.get("employee_id") if isinstance(data, dict) else None

    if isinstance(emp_id, int) and emp_id > 0:
        args = dict(args)
        args["employee_id"] = emp_id

    return args

_NUM_RE = re.compile(r"\d+")
_CODE_RE = re.compile(r"\b[A-Z]{2,}-\d+\b")  # PO-20250001, GR-..., PR-...

def _extract_numbers(text: str) -> set[str]:
    return set(_NUM_RE.findall(text or ""))

def _extract_codes(text: str) -> set[str]:
    return set(_CODE_RE.findall(text or ""))

def _compose_safe_enough(answer: str, payload_text: str) -> bool:
    if not answer:
        return False
    if len(answer) > 800:
        return False
    if "..." in answer:
        return False
    if "{{" in answer or "}}" in answer:
        return False

    # không sinh số/mã mới ngoài payload
    an = _extract_numbers(answer)
    pn = _extract_numbers(payload_text)
    if not an.issubset(pn):
        return False

    ac = _extract_codes(answer)
    pc = _extract_codes(payload_text)
    if not ac.issubset(pc):
        return False

    return True

VAR_SGL_RE = re.compile(r"\{\s*(s[0-9]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}")
FULL_TPL_RE = re.compile(r"^\s*\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}\s*$")
VAR_DBL_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}")

class UnresolvedRefError(Exception):
    pass


def _get_path(store: dict, path: str):
    cur: Any = store
    for part in path.split("."):
        m = re.match(r"^([a-zA-Z0-9_]+)(\[[0-9]+\])?$", part)
        if not m:
            raise KeyError(path)
        key = m.group(1)
        cur = cur[key]
        if m.group(2):
            idx = int(m.group(2)[1:-1])
            cur = cur[idx]
    return cur


def _render_value(tpl: str, store: dict):
    tpl = tpl or ""

    # full placeholder => trả đúng type
    m = FULL_TPL_RE.match(tpl)
    if m:
        path = m.group(1)
        try:
            return _get_path(store, path)
        except Exception:
            # fallback: s1.xxx -> s1.data.xxx (nếu store s1 là wrapper có data)
            m2 = re.match(r"^(s[0-9]+)\.(.+)$", path)
            if m2:
                step_id = m2.group(1)
                rest = m2.group(2)
                return _get_path(store, f"{step_id}.data.{rest}")
            raise

    # partial replace => string
    def repl(mm):
        path = mm.group(1)
        try:
            val = _get_path(store, path)
            return "" if val is None else str(val)
        except Exception:
            m2 = re.match(r"^(s[0-9]+)\.(.+)$", path)
            if m2:
                step_id = m2.group(1)
                rest = m2.group(2)
                val = _get_path(store, f"{step_id}.data.{rest}")
                return "" if val is None else str(val)
            return mm.group(0)

    return VAR_DBL_RE.sub(repl, tpl)


def _normalize_ref(s: str) -> str:
    s = (s or "").strip()

    # NEW: hỗ trợ ${var.path}
    m = re.fullmatch(r"\$\{\s*([A-Za-z_]\w*(?:\[[0-9]+\]|\.[A-Za-z_]\w*)*)\s*\}", s)
    if m:
        return "{{" + m.group(1) + "}}"

    # NEW: hỗ trợ {$var.path}
    m = re.fullmatch(r"\{\s*\$\s*([A-Za-z_]\w*(?:\[[0-9]+\]|\.[A-Za-z_]\w*)*)\s*\}", s)
    if m:
        return "{{" + m.group(1) + "}}"

    # 1) JSONPath dạng $.a.b -> {{a.b}}
    if s.startswith("$."):
        return "{{" + s[2:] + "}}"

    # 2) Biến dạng $nv_info.id hoặc $partial_pos[0].po_code -> {{nv_info.id}} / {{partial_pos[0].po_code}}
    if s.startswith("$") and not s.startswith("$."):
        if re.fullmatch(r"\$[A-Za-z_]\w*(?:\[[0-9]+\]|\.[A-Za-z_]\w*)*", s):
            return "{{" + s[1:] + "}}"

    return s


def _resolve_args(args: Dict[str, Any], store: dict) -> Dict[str, Any]:
    out = {}
    for k, v in (args or {}).items():
        if isinstance(v, str):
            v2 = _normalize_ref(v)
            try:
                rendered = _render_value(v2, store)
            except Exception as e:
                raise UnresolvedRefError(f"Không resolve được biến cho arg '{k}': {v} ({e})")
            # nếu vẫn còn {{ }} => unresolved
            if isinstance(rendered, str) and ("{{" in rendered or "}}" in rendered):
                raise UnresolvedRefError(f"Không resolve được biến cho arg '{k}': {v} -> {rendered}")
            out[k] = rendered
        else:
            out[k] = v
    return out

def _execute_tool(module: str, tool: ToolSpec, args: Dict[str, Any]) -> Dict[str, Any]:
    if module == "hrm":
        session = HrmSessionLocal()
        try:
            parsed = tool.args_model.model_validate(args)
            return tool.handler(session=session, **parsed.model_dump())
        except Exception as e:
            raise ToolExecutionError(str(e))
        finally:
            session.close()

    raise ToolExecutionError(f"Chưa hỗ trợ executor cho module '{module}'.")


def _s(v, default="N/A"):
    if v is None: return default
    if isinstance(v, str) and not v.strip(): return default
    return v

def _fmt_date_vi(iso: Any) -> str:
    if not iso:
        return "N/A"
    if isinstance(iso, str):
        s = iso.strip()
        if not s:
            return "N/A"
        try:
            dt = datetime.fromisoformat(s.replace("Z", ""))
            return dt.strftime("%d/%m/%Y")
        except Exception:
            # fallback: lấy phần YYYY-MM-DD
            return s.split("T")[0]
    return str(iso)


def _fmt_list(lines: List[str], limit: int = 7) -> str:
    if not lines: return ""
    shown = lines[:limit]
    more = len(lines) - len(shown)
    return "\n".join(shown) + (f"\n(+{more} dòng)" if more > 0 else "")

def _fmt_money(v: Any) -> str:
    if v is None:
        return "N/A"
    try:
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return "N/A"
            v = float(s.replace(",", ""))
        return f"{float(v):,.0f}"
    except Exception:
        return str(v)

def _fallback_from_result(result: Any) -> Optional[str]:
    if not isinstance(result, dict):
        return None

    data = result.get("data")
    msg = (result.get("thong_diep") or "").strip()

    # ok(None, "...")
    if data is None:
        return msg or None

    # =========================
    # HRM: Nhân sự (card)
    # =========================
    if isinstance(data, dict) and "employee_code" in data and "full_name" in data:
        code = _s(data.get("employee_code"))
        name = _s(data.get("full_name"))
        status = _s(data.get("status"))
        dept = _s(data.get("department_name"))
        dept_code = _s(data.get("department_code"))
        pos = _s(data.get("position_title"))
        phone = _s(data.get("phone"))
        email = _s(data.get("email_company"))
        join_date = _fmt_date_vi(data.get("join_date"))
        resign_date = _fmt_date_vi(data.get("resign_date")) if data.get("resign_date") else "N/A"

        lines = [
            f"Nhân viên {code} - {name} (trạng thái: {status}).",
            f"Phòng ban: {dept_code} - {dept}.",
            f"Chức vụ: {pos}.",
            f"Liên hệ: {phone} | {email}.",
            f"Ngày vào: {join_date}. Nghỉ việc: {resign_date}.",
        ]
        return "\n".join(lines) if not msg else f"{msg}\n" + "\n".join(lines)

    # =========================
    # HRM: Chấm công theo ngày (dict có timesheet_id + date)
    # =========================
    if isinstance(data, dict) and "timesheet_id" in data and "date" in data and "status" in data:
        d = _fmt_date_vi(data.get("date"))
        st = _s(data.get("status"))
        cin = _s(data.get("check_in_time"))
        cout = _s(data.get("check_out_time"))
        late = data.get("late_minutes", 0)
        early = data.get("early_leave_minutes", 0)
        ot = data.get("ot_hours", 0)
        shift = _s(data.get("shift_name"))
        logs = data.get("attendance_logs") if isinstance(data.get("attendance_logs"), list) else []
        log_txt = f"Số log: {len(logs)}." if logs is not None else ""

        base = [
            f"Chấm công ngày {d}: {st}.",
            f"Ca: {shift}. Check-in: {cin}. Check-out: {cout}.",
            f"Đi muộn: {late} phút. Về sớm: {early} phút. OT: {ot} giờ. {log_txt}".strip(),
        ]
        base = [x for x in base if x]
        return "\n".join(base) if not msg else f"{msg}\n" + "\n".join(base)

    # =========================
    # HRM: Lịch sử chấm công (list)
    # =========================
    if isinstance(data, list) and data and isinstance(data[0], dict) and "date" in data[0] and "status" in data[0]:
        lines = []
        for r in data[:7]:
            d = _fmt_date_vi(r.get("date"))
            st = _s(r.get("status"))
            cin = _s(r.get("check_in_time"))
            cout = _s(r.get("check_out_time"))
            late = r.get("late_minutes", 0)
            ot = r.get("ot_hours", 0)
            lines.append(f"- {d}: {st} | in {cin} | out {cout} | late {late}p | OT {ot}h")
        txt = "Lịch sử chấm công:\n" + _fmt_list(lines, 7)
        return txt if not msg else f"{msg}\n{txt}"

    # =========================
    # HRM: Tổng hợp chấm công tháng (dict)
    # =========================
    if isinstance(data, dict) and {"month", "year", "present_days", "absent_days", "leave_days"}.issubset(data.keys()):
        m = data.get("month")
        y = data.get("year")
        txt = (
            f"Tổng hợp chấm công {m:02d}/{y}: "
            f"Đi làm {data.get('present_days', 0)}, "
            f"Vắng {data.get('absent_days', 0)}, "
            f"Nghỉ {data.get('leave_days', 0)}. "
            f"Đi muộn {data.get('late_minutes', 0)} phút, "
            f"Về sớm {data.get('early_leave_minutes', 0)} phút, "
            f"OT {data.get('ot_hours', 0)} giờ."
        )
        return txt if not msg else f"{msg}\n{txt}"

    # =========================
    # HRM: Ngày thiếu checkout
    # =========================
    if isinstance(data, dict) and "missing_checkout_days" in data and isinstance(data.get("missing_checkout_days"), list):
        m = data.get("month")
        y = data.get("year")
        rows = data.get("missing_checkout_days") or []

        if not rows:
            return f"Không có ngày nào thiếu check-out trong {m:02d}/{y}."
        
        lines = []
        for r in rows[:10]:
            lines.append(f"- { _fmt_date_vi(r.get('date')) }: check-in { _s(r.get('check_in_time')) }")
        txt = f"Danh sách ngày thiếu check-out ({m:02d}/{y}):\n" + _fmt_list(lines, 10)
        return txt if not msg else f"{msg}\n{txt}"

    # =========================
    # HRM: Nghỉ phép (list)
    # =========================
    if isinstance(data, list) and data and isinstance(data[0], dict) and "leave_request_id" in data[0]:
        lines = []
        for r in data[:8]:
            lines.append(
                f"- #{r.get('leave_request_id')} | {r.get('leave_type')} | "
                f"{_fmt_date_vi(r.get('from_date'))} → {_fmt_date_vi(r.get('to_date'))} | "
                f"{r.get('total_days')} ngày | {r.get('status')}"
            )
        txt = "Danh sách đơn nghỉ phép:\n" + _fmt_list(lines, 8)
        return txt if not msg else f"{msg}\n{txt}"

    # HRM: Nghỉ phép (detail)
    if isinstance(data, dict) and "leave_request_id" in data and "leave_type" in data and "status" in data:
        txt = (
            f"Đơn nghỉ phép #{data.get('leave_request_id')}: {data.get('leave_type')} | "
            f"{_fmt_date_vi(data.get('from_date'))} → {_fmt_date_vi(data.get('to_date'))} | "
            f"{data.get('total_days')} ngày | Trạng thái: {data.get('status')}.\n"
            f"Lý do: {_s(data.get('reason'))}."
        )
        return txt if not msg else f"{msg}\n{txt}"

    # HRM: tổng hợp nghỉ phép năm
    if isinstance(data, dict) and "approved_total_days" in data and "year" in data and "employee_id" in data:
        txt = (
            f"Tổng nghỉ phép đã duyệt năm {data.get('year')} (employee_id={data.get('employee_id')}): "
            f"{data.get('approved_total_days', 0)} ngày."
        )
        return txt if not msg else f"{msg}\n{txt}"

    # =========================
    # HRM: Tăng ca (list / detail / summary)
    # =========================
    if isinstance(data, list) and data and isinstance(data[0], dict) and "ot_request_id" in data[0]:
        lines = []
        for r in data[:8]:
            lines.append(
                f"- #{r.get('ot_request_id')} | {r.get('ot_date')} | "
                f"{r.get('from_time')}–{r.get('to_time')} | {r.get('total_hours')}h | {r.get('status')}"
            )
        txt = "Danh sách đơn tăng ca:\n" + _fmt_list(lines, 8)
        return txt if not msg else f"{msg}\n{txt}"

    if isinstance(data, dict) and "ot_request_id" in data and "ot_date" in data:
        txt = (
            f"Đơn OT #{data.get('ot_request_id')} ({data.get('ot_type')}): {data.get('ot_date')} | "
            f"{data.get('from_time')}–{data.get('to_time')} | {data.get('total_hours')} giờ | "
            f"Trạng thái: {data.get('status')}.\n"
            f"Lý do: {_s(data.get('reason'))}."
        )
        return txt if not msg else f"{msg}\n{txt}"

    if isinstance(data, dict) and "breakdown" in data and isinstance(data.get("breakdown"), list):
        m = data.get("month")
        y = data.get("year")
        rows = data.get("breakdown") or []
        lines = []
        for r in rows[:10]:
            lines.append(f"- {r.get('ot_type')}: {r.get('approved_hours')} giờ")
        txt = f"Tổng hợp OT đã duyệt {m:02d}/{y}:\n" + _fmt_list(lines, 10)
        return txt if not msg else f"{msg}\n{txt}"

    # =========================
    # HRM: Hợp đồng
    # =========================
    if isinstance(data, dict) and "contract_number" in data and "basic_salary" in data:
        txt = (
            f"Hợp đồng {data.get('contract_number')} ({data.get('contract_type')}): "
            f"{_fmt_date_vi(data.get('start_date'))} → {_fmt_date_vi(data.get('end_date'))}. "
            f"Lương cơ bản: {_fmt_money(data.get('basic_salary'))}. "
            f"PC trách nhiệm: {_fmt_money(data.get('allowance_responsibility'))}, "
            f"PC đi lại: {_fmt_money(data.get('allowance_transport'))}, "
            f"PC ăn trưa: {_fmt_money(data.get('allowance_lunch'))}. "
            f"Trạng thái: {data.get('status')}."
        )
        return txt if not msg else f"{msg}\n{txt}"

    if isinstance(data, list) and data and isinstance(data[0], dict) and "contract_number" in data[0]:
        lines = []
        for r in data[:8]:
            lines.append(
                f"- {r.get('contract_number')} | {r.get('contract_type')} | "
                f"{_fmt_date_vi(r.get('start_date'))} → {_fmt_date_vi(r.get('end_date'))} | {r.get('status')}"
            )
        txt = "Lịch sử hợp đồng:\n" + _fmt_list(lines, 8)
        return txt if not msg else f"{msg}\n{txt}"

    if isinstance(data, dict) and "rows" in data and isinstance(data.get("rows"), list) and "from" in data and "to" in data:
        lines = []
        for r in (data.get("rows") or [])[:10]:
            lines.append(
                f"- {r.get('contract_number')} | {r.get('employee_id')} | "
                f"end {_fmt_date_vi(r.get('end_date'))} | {r.get('status')}"
            )
        txt = f"Hợp đồng sắp hết hạn ({_fmt_date_vi(data.get('from'))} → {_fmt_date_vi(data.get('to'))}):\n" + _fmt_list(lines, 10)
        return txt if not msg else f"{msg}\n{txt}"

    # =========================
    # HRM: Danh mục (phòng ban/chức vụ/ca làm)
    # =========================
    if isinstance(data, list) and data and isinstance(data[0], dict) and "department_code" in data[0]:
        lines = [f"- {r.get('department_code')}: {r.get('department_name')}" for r in data[:10]]
        txt = "Danh sách phòng ban:\n" + _fmt_list(lines, 10)
        return txt if not msg else f"{msg}\n{txt}"

    if isinstance(data, list) and data and isinstance(data[0], dict) and "position_title" in data[0]:
        lines = []
        for r in data[:10]:
            lines.append(f"- {r.get('position_title')} | { _fmt_money(r.get('base_salary_range_min')) } → { _fmt_money(r.get('base_salary_range_max')) }")
        txt = "Danh sách chức vụ:\n" + _fmt_list(lines, 10)
        return txt if not msg else f"{msg}\n{txt}"

    if isinstance(data, list) and data and isinstance(data[0], dict) and "shift_name" in data[0] and "start_time" in data[0]:
        lines = [f"- {r.get('shift_name')}: {r.get('start_time')}–{r.get('end_time')}" for r in data[:10]]
        txt = "Danh sách ca làm:\n" + _fmt_list(lines, 10)
        return txt if not msg else f"{msg}\n{txt}"

    # =========================
    # HRM: Kỳ lương / Payslip / Chi tiết lương
    # =========================
    if isinstance(data, list) and data and isinstance(data[0], dict) and "payroll_period_id" in data[0] and "month" in data[0]:
        lines = []
        for r in data[:10]:
            lines.append(f"- #{r.get('payroll_period_id')} | {r.get('name')} | {r.get('month'):02d}/{r.get('year')} | {r.get('status')}")
        txt = "Danh sách kỳ lương:\n" + _fmt_list(lines, 10)
        return txt if not msg else f"{msg}\n{txt}"

    if isinstance(data, dict) and "payslip_id" in data and "net_salary" in data and "period_name" in data:
        txt = (
            f"{data.get('period_name')} ({data.get('month'):02d}/{data.get('year')}): "
            f"Lương gross {_fmt_money(data.get('gross_salary'))}, "
            f"khấu trừ {_fmt_money(data.get('total_deduction'))}, "
            f"thực nhận {_fmt_money(data.get('net_salary'))}. "
            f"OT: {data.get('total_ot_hours')}h | Công: {data.get('total_working_days')} | Trạng thái: {data.get('status')}."
        )
        return txt if not msg else f"{msg}\n{txt}"

    if isinstance(data, dict) and "lines" in data and isinstance(data.get("lines"), list) and "total_allowance" in data and "total_deduction" in data:
        lines = []
        for r in (data.get("lines") or [])[:12]:
            lines.append(
                f"- {r.get('rule_code')} | {r.get('rule_name')} | {r.get('rule_type')} | { _fmt_money(r.get('amount')) }"
            )
        txt = (
            f"Chi tiết bảng lương (payslip_id={data.get('payslip_id')}):\n"
            f"Tổng phụ cấp: {_fmt_money(data.get('total_allowance'))}. "
            f"Tổng khấu trừ: {_fmt_money(data.get('total_deduction'))}.\n"
            f"Dòng chi tiết:\n{_fmt_list(lines, 12)}"
        )
        return txt if not msg else f"{msg}\n{txt}"

    # =========================
    # HRM: Face data
    # =========================
    if isinstance(data, dict) and "has_active_face_data" in data and "employee_id" in data:
        txt = (
            f"Face data employee_id={data.get('employee_id')}: "
            f"{'ĐÃ có' if data.get('has_active_face_data') else 'CHƯA có'} dữ liệu active. "
            f"image_path={_s(data.get('image_path'))}."
        )
        return txt if not msg else f"{msg}\n{txt}"

    # =========================
    # HRM: Payment request
    # =========================
    if isinstance(data, list) and data and isinstance(data[0], dict) and "request_code" in data[0] and "total_amount" in data[0]:
        lines = []
        for r in data[:10]:
            lines.append(
                f"- {r.get('request_code')} | period_id={r.get('payroll_period_id')} | "
                f"{_fmt_money(r.get('total_amount'))} | {r.get('status')}"
            )
        txt = "Danh sách yêu cầu thanh toán HRM:\n" + _fmt_list(lines, 10)
        return txt if not msg else f"{msg}\n{txt}"

    if isinstance(data, dict) and "request_code" in data and "total_amount" in data:
        txt = (
            f"Yêu cầu {data.get('request_code')} (period_id={data.get('payroll_period_id')}): "
            f"Tổng tiền {_fmt_money(data.get('total_amount'))}, "
            f"số NV {data.get('total_employees')}, trạng thái {data.get('status')}, "
            f"finance_txn_id={_s(data.get('finance_transaction_id'))}."
        )
        return txt if not msg else f"{msg}\n{txt}"

    # fallback cuối: nếu có msg thì trả msg
    return msg or None

def _drop_none(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}

def _is_bad_answer(answer: str) -> bool:
    if not answer: return True
    if "..." in answer: return True
    if "{{" in answer or "}}" in answer: return True
    if "{s" in answer: return True
    return False

# Các field nhạy cảm HRM: mặc định không đưa vào payload preview/LLM
_HRM_SENSITIVE_KEYS = {
    "phone", "phone_number",
    "email", "email_company", "email_personal",
    "address", "home_address",
    "identity_no", "id_no", "cccd", "passport",
}

def _drop_none(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}

def _strip_sensitive(d: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(d, dict):
        return d
    return {k: v for k, v in d.items() if k not in _HRM_SENSITIVE_KEYS}

def _filter_row_hrm(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Chọn field theo “shape” HRM để:
    - Payload gọn
    - Không lộ PII
    """
    row = _strip_sensitive(row)
    keys = set(row.keys())

    # 1) Nhân viên (employee profile)
    if "employee_code" in keys or "employee_id" in keys:
        keep = [
            "employee_id", "user_id",
            "employee_code", "full_name", "status",
            "department_code", "department_name",
            "position_title",
            "join_date", "resign_date",
        ]

    # 2) Đơn nghỉ phép
    elif "leave_request_id" in keys or ("leave_type" in keys and "from_date" in keys):
        keep = [
            "leave_request_id", "id",
            "employee_id",
            "leave_type",
            "from_date", "to_date",
            "total_days",
            "status",
            "approver_id",
            "reason",
            "approved_at",
        ]

    # 3) Chấm công ngày (timesheet daily)
    elif "date" in keys and ("check_in_time" in keys or "check_out_time" in keys):
        keep = [
            "date",
            "status",
            "shift_code", "shift_name",
            "check_in_time", "check_out_time",
            "late_minutes", "early_leave_minutes",
            "ot_hours",
        ]

    # 4) Tổng hợp chấm công tháng
    elif "month" in keys and "year" in keys and ("late_minutes" in keys or "present_days" in keys):
        keep = [
            "month", "year",
            "days_total",
            "present_days", "absent_days", "leave_days",
            "late_minutes", "early_leave_minutes",
            "ot_hours",
            "working_day_count",
        ]

    # 5) Thiếu check-out (tool ngay_thieu_checkout)
    elif "missing_checkout_days" in keys:
        keep = ["month", "year", "missing_checkout_days"]

    # 6) OT theo ngày / danh sách OT (nếu bạn có tool OT)
    elif "ot_hours" in keys and ("date" in keys or "from_time" in keys or "to_time" in keys):
        keep = [
            "date", "ot_hours",
            "status",
            "reason",
            "approver_id",
        ]

    else:
        keep = list(keys)[:10]  # generic fallback

    out: Dict[str, Any] = {}
    for k in keep:
        if k in row:
            out[k] = row.get(k)

    # Nếu missing_checkout_days là list dict => preview từng item gọn
    if "missing_checkout_days" in out and isinstance(out["missing_checkout_days"], list):
        items = []
        for x in out["missing_checkout_days"][:20]:
            if isinstance(x, dict):
                x = _strip_sensitive(x)
                items.append(_drop_none({
                    "date": x.get("date"),
                    "check_in_time": x.get("check_in_time"),
                }))
            else:
                items.append(x)
        out["missing_checkout_days"] = items

    return _drop_none(out)

def _preview_data_hrm(data: Any, list_n: int = 6, nested_n: int = 10) -> Dict[str, Any]:
    # list output
    if isinstance(data, list):
        preview = []
        for r in data[:max(1, min(list_n, 20))]:
            if isinstance(r, dict):
                preview.append(_filter_row_hrm(r))
            else:
                preview.append(r)
        return {"type": "list", "total": len(data), "items_preview": preview}

    # object output
    if isinstance(data, dict):
        data2 = _strip_sensitive(data)
        out: Dict[str, Any] = {"type": "object"}

        keys = set(data2.keys())

        # core fields theo shape
        if "employee_code" in keys or "employee_id" in keys:
            core_keep = [
                "employee_id", "employee_code", "full_name", "status",
                "department_code", "department_name", "position_title",
                "join_date", "resign_date",
            ]
        elif "leave_request_id" in keys or ("leave_type" in keys and "from_date" in keys):
            core_keep = [
                "leave_request_id", "employee_id",
                "leave_type", "from_date", "to_date", "total_days",
                "status", "approver_id", "approved_at",
            ]
        elif "month" in keys and "year" in keys and ("late_minutes" in keys or "present_days" in keys):
            core_keep = [
                "month", "year",
                "days_total", "present_days", "absent_days", "leave_days",
                "late_minutes", "early_leave_minutes", "ot_hours",
            ]
        elif "missing_checkout_days" in keys:
            core_keep = ["month", "year"]
        else:
            # fallback: scalar keys tối đa 10
            core_keep = []
            for k, v in data2.items():
                if isinstance(v, (str, int, float, bool)) or v is None:
                    core_keep.append(k)
                if len(core_keep) >= 10:
                    break

        core = {}
        for k in core_keep:
            if k in data2:
                core[k] = data2.get(k)
        out["core"] = _drop_none(core)

        # nested preview
        if isinstance(data2.get("missing_checkout_days"), list):
            items = data2["missing_checkout_days"]
            out["missing_checkout_total"] = len(items)
            out["missing_checkout_preview"] = [
                _drop_none({"date": x.get("date"), "check_in_time": x.get("check_in_time")})
                for x in items[:max(1, min(nested_n, 20))]
                if isinstance(x, dict)
            ]

        if isinstance(data2.get("items"), list):
            items = data2["items"]
            out["items_total"] = len(items)
            out["items_preview"] = [
                _filter_row_hrm(x) for x in items[:max(1, min(nested_n, 20))] if isinstance(x, dict)
            ]

        return out

    # primitive
    return {"type": type(data).__name__, "value": data}

def _build_facts_for_paraphrase_hrm(store: Dict[str, Any], list_n: int = 6, nested_n: int = 10) -> Dict[str, Any]:
    """
    Dùng cho:
    - log/debug
    - hoặc frontend/LLM muốn “facts” gọn theo từng step
    """
    steps = []
    i = 1
    while True:
        si = store.get(f"s{i}")
        if not isinstance(si, dict):
            break
        steps.append(_drop_none({
            "step": f"s{i}",
            "tool_message": si.get("thong_diep"),
            "ok": si.get("ok"),
            "preview": _preview_data_hrm(si.get("data"), list_n=list_n, nested_n=nested_n),
        }))
        i += 1

    return _drop_none({
        "steps_total": len(steps),
        "steps": steps,
        "store_keys": list(store.keys())[:30],
    })

def _build_compose_payload_hrm(
    module: str,
    role: Optional[str],
    question: str,
    step_infos: List[dict],
    draft_answer: Optional[str] = None,
):
    """
    Payload sạch để frontend đưa cho LLM:
    - Không lộ phone/email
    - Dữ liệu đã clip + preview đúng shape HRM
    """
    tool_results = []
    for si in (step_infos or []):
        r = si.get("result")
        data = None
        thong_diep = None
        ok_flag = None

        if isinstance(r, dict):
            data = r.get("data")
            thong_diep = r.get("thong_diep")
            ok_flag = r.get("ok")
        else:
            data = r

        # nếu bạn vẫn muốn clip sâu thì dùng _clip_data của bạn
        # ở đây preview_data_hrm đã đủ gọn, còn muốn giữ raw thì tuỳ
        tool_results.append(_drop_none({
            "step_id": si.get("id"),
            "tool": si.get("tool"),
            "args": si.get("args"),
            "ok": ok_flag,
            "thong_diep": thong_diep,
            "preview": _preview_data_hrm(data, list_n=6, nested_n=10),
        }))

    return _drop_none({
        "module": module,
        "role": role,
        "question": question,
        "draft_answer": draft_answer,
        "tool_results": tool_results,
    })

def compose_answer_with_llm(module: str, user_question: str, step_infos: list[dict]) -> str:
    filtered_step_infos = _filter_step_infos_for_compose(module, user_question, step_infos)
    requested_metrics = _extract_requested_metrics(user_question)

    payload = {
        "module": module,
        "question": user_question,
        "requested_metrics": requested_metrics,
        "tool_results": [
            {
                "step_id": si["id"],
                "tool": si["tool"],
                "data": (si.get("result") or {}).get("data"),
                "thong_diep": (si.get("result") or {}).get("thong_diep"),
                "ok": (si.get("result") or {}).get("ok"),
            }
            for si in filtered_step_infos
        ],
    }

    sys = """
Bạn là trợ lý ERP. Trả lời NGẮN GỌN, đúng trọng tâm theo câu hỏi.
QUY TẮC:
- Chỉ dùng dữ liệu trong tool_results.
- Nếu requested_metrics có "late_minutes" thì chỉ trả tổng phút đi muộn (kèm tháng/năm nếu có).
- Nếu câu hỏi chỉ hỏi 1 ý, KHÔNG thêm thông tin khác (không nhắc phòng ban, email, SĐT, chức vụ...).
- Nếu tool_results trả list rỗng: trả "Không có." hoặc "Không có dữ liệu phù hợp." đúng ngữ cảnh.
- Ưu tiên 1 câu, tối đa 2 câu.
"""

    resp = _client.models.generate_content(
        model=_GEMINI_COMPOSE_MODEL,
        contents=json.dumps(payload, ensure_ascii=False),
        config={"system_instruction": sys, "temperature": 0.1},
    )
    return (resp.text or "").strip()

# =========================
# Main
# =========================
def execute_chat_hrm(
    module: str,
    user_id: int | None,
    role: str | None,
    message: str,
    paraphrase_enabled: bool = True,
    compose_enabled: bool = True,
):
    if not check_role(module, role):
        raise PermissionDenied(f"Role '{role}' không được phép dùng chatbot module '{module}'.")

    auth = {"user_id": user_id, "role": role, "is_authenticated": True}
    plan = plan_route(module=module, message=message, auth=auth)
    audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

    if plan.needs_clarification:
        return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

    validate_plan(plan)

    store: Dict[str, Any] = {}
    step_infos: list[dict] = []

    # --- run tools ---
    for idx, step in enumerate(plan.steps, start=1):
        tool = get_tool(plan.module, step.tool)
        if tool is None:
            raise ToolExecutionError(f"Không tìm thấy tool '{step.tool}' trong module '{plan.module}'.")

        try:
            resolved_args = _resolve_args(step.args, store)

            def _now_bkk():
                return datetime.now(ZoneInfo("Asia/Bangkok"))

            text = (message or "").lower()

            if step.tool in {"ngay_thieu_checkout", "tong_hop_cham_cong_thang"}:
                if re.search(r"\btháng này\b", text):
                    now = _now_bkk()
                    resolved_args["month"] = now.month
                    resolved_args["year"] = now.year

            if plan.module == "hrm":
                resolved_args = _auto_resolve_hrm_employee_id(resolved_args)

                audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": resolved_args})
                result = _execute_tool(plan.module, tool, resolved_args)

        except UnresolvedRefError as e:
            audit({"event": "arg_unresolved_stop", "error": str(e), "step": step.model_dump()})
            break

        resolved_args = inject_auth_into_args(
            message=message,
            role=role,
            auth_user_id=user_id,
            tool_args=resolved_args,
            has_target_user_id_field=_args_has_target_user_id_field(tool),
        )

        audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": resolved_args})
        result = _execute_tool(plan.module, tool, resolved_args)
        audit({"event": "tool_result", "module": plan.module, "tool": step.tool, "result": result})

        step_infos.append({"id": step.id, "tool": step.tool, "args": resolved_args, "result": result})

        if isinstance(result, dict) and result.get("needs_clarification"):
            return {"answer": result.get("question"), "candidates": result.get("candidates"), "plan": plan.model_dump()}

        store[step.id] = result
        store[f"s{idx}"] = result

        if getattr(step, "save_as", None):
            if isinstance(result, dict) and "data" in result:
                store[step.save_as] = result.get("data")
                store[f"{step.save_as}__raw"] = result
            else:
                store[step.save_as] = result

    # --- FILTER context-only tool outputs trước khi LLM compose ---
    step_infos_for_answer = _filter_step_infos_for_answer(plan.module, message, step_infos)

    # ===== Compose answer bằng LLM (cho mọi module) =====
    answer = None
    composed_used = False

    if compose_enabled:
        try:
            composed = compose_answer_with_llm(plan.module, message, step_infos)
            if composed:
                answer = composed
                composed_used = True
        except Exception as e:
            audit({"event": "compose_failed", "error": str(e)})

    # ===== Fallback deterministic nếu LLM fail =====
    if not answer:
        parts = []
        suppress = CONTEXT_ONLY_TOOLS_BY_MODULE.get(plan.module, set())
        skip_employee = (plan.module == "hrm" and not _wants_employee_profile(message))

        for i in range(1, len(plan.steps) + 1):
            step = plan.steps[i - 1]
            if skip_employee and step.tool in suppress:
                continue

            si = store.get(f"s{i}")
            if isinstance(si, dict):
                fb = _fallback_from_result(si)
                if fb and fb not in parts:
                    parts.append(fb)

        answer = "\n\n".join(parts[:2]) if parts else "Đã tra cứu xong."


    # ===== Paraphrase (chỉ khi KHÔNG dùng LLM compose) =====
    if paraphrase_enabled and (not composed_used):
        facts_for_paraphrase = _build_facts_for_paraphrase_hrm(store, list_n=6, nested_n=6)
        answer_final = paraphrase_answer(answer, facts=facts_for_paraphrase, enabled=True)
    else:
        answer_final = answer

    return {"answer": answer_final, "data": store, "plan": plan.model_dump()}