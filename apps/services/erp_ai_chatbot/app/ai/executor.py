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

from app.db.supply_chain_database import SupplyChainSessionLocal
from app.db.hrm_database import HrmSessionLocal
from app.ai.paraphraser import paraphrase_answer

import json
import os
from dotenv import load_dotenv
from google import genai
import re
from typing import Any, Dict

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_COMPOSE_MODEL = os.getenv("GEMINI_COMPOSE_MODEL", os.getenv("GEMINI_MODEL_1", "gemini-2.5-flash"))
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

# Fix để câu trả lời chỉ bám câu hỏi (không lôi thông tin NV)
# Tool chỉ để lấy context (không nên đưa vào câu trả lời cuối)
CONTEXT_ONLY_TOOLS_BY_MODULE: dict[str, set[str]] = {
    "hrm": {"tim_nhan_vien", "thong_tin_nhan_vien"},
    # "supply_chain": {...}  # nếu sau này có tool chỉ để lấy context thì thêm vào
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


def _clip_data(data: Any, list_n: int = 12, nested_n: int = 12) -> Any:
    # primitive
    if data is None or isinstance(data, (str, int, float, bool)):
        return data

    # list
    if isinstance(data, list):
        return [_clip_data(x, list_n=list_n, nested_n=nested_n) for x in data[:list_n]]

    # dict
    if isinstance(data, dict):
        out = {}
        for k, v in data.items():
            if isinstance(v, list):
                out[k] = [_clip_data(x, list_n=list_n, nested_n=nested_n) for x in v[:nested_n]]
            elif isinstance(v, dict):
                out[k] = _clip_data(v, list_n=list_n, nested_n=nested_n)
            else:
                out[k] = v
        return out

    # fallback
    return str(data)

import re
from typing import Any, Dict

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
    if module == "supply_chain":
        session = SupplyChainSessionLocal()
        try:
            parsed = tool.args_model.model_validate(args)
            return tool.handler(session=session, **parsed.model_dump())
        except Exception as e:
            raise ToolExecutionError(str(e))
        finally:
            session.close()

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

import json

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

def _fallback_from_data(data: Any) -> Optional[str]:
    # -------------------------
    # 1) RAG
    # -------------------------
    if isinstance(data, dict) and "answer" in data and "sources" in data and isinstance(data["sources"], list):
        src_lines = []
        for s in data["sources"][:4]:
            if isinstance(s, dict):
                src_lines.append(f"- {s.get('source')}: {s.get('snippet')}")
        return f"{data.get('answer')}\n\nNguồn tham khảo:\n{_fmt_list(src_lines, 4)}"

    # -------------------------
    # 2) Dict: Tồn kho chi tiết
    # -------------------------
    if isinstance(data, dict) and {"sku", "product_name", "total_available", "total_allocated", "total_on_hand"}.issubset(data.keys()):
        lines = []
        details = data.get("details") or []
        for d in details[:5]:
            lines.append(
                f"- {d.get('warehouse_code')} ({d.get('warehouse_name')}), bin {_s(d.get('bin_code'))}: "
                f"khả dụng {d.get('available')} (tồn {d.get('on_hand')}, giữ {d.get('allocated')})"
            )
        extra = ("\nChi tiết:\n" + "\n".join(lines)) if lines else ""
        return (
            f"Tồn kho SKU {data['sku']} ({data['product_name']}): "
            f"khả dụng {data['total_available']}, đang giữ {data['total_allocated']}, tồn {data['total_on_hand']}."
            f"{extra}"
        )

    # -------------------------
    # 3) Dict: Log biến động tồn kho (tool của bạn trả dict {sku, product_name, logs:[...]})
    # -------------------------
    if isinstance(data, dict) and "logs" in data and isinstance(data["logs"], list):
        sku = data.get("sku")
        pname = data.get("product_name")
        logs = data.get("logs") or []
        if not logs:
            return f"Không có log biến động tồn kho cho SKU {_s(sku)} ({_s(pname)})."
        lines = []
        for x in logs[:12]:
            if isinstance(x, dict):
                lines.append(
                    f"- {_s(x.get('transaction_date'))} | {x.get('transaction_type')} | Δ {x.get('quantity_change')} | ref {_s(x.get('reference_code'))}"
                )
        return f"Log biến động tồn kho SKU {_s(sku)} ({_s(pname)}):\n{_fmt_list(lines, 12)}"

    # -------------------------
    # 4) Dict: danh sách GR theo NCC/PO (shape {supplier_code/supplier_name, gr_list:[...]})
    # -------------------------
    if isinstance(data, dict) and "gr_list" in data and isinstance(data["gr_list"], list):
        sup = data.get("supplier_name") or data.get("supplier_code")
        po_code = data.get("po_code")
        grs = data.get("gr_list") or []
        header = "Danh sách phiếu nhập (GR)"
        if sup:
            header += f" của {_s(sup)}"
        if po_code:
            header += f" (PO {po_code})"
        if not grs:
            return header + ": không có dữ liệu."
        lines = []
        for g in grs[:10]:
            if isinstance(g, dict):
                lines.append(f"- {g.get('gr_code')} | {g.get('status')} | {_s(g.get('receipt_date'))} | PO {_s(g.get('po_code'))}")
        return f"{header} (hiển thị {min(len(grs),10)}/{len(grs)}):\n{_fmt_list(lines, 10)}"

    # -------------------------
    # 5) Dict: chi tiết chứng từ có items[]
    # -------------------------
    if isinstance(data, dict) and isinstance(data.get("items"), list) and data.get("items"):
        # PO
        if "po_code" in data:
            po = data.get("po_code")
            st = data.get("status")
            sup = data.get("supplier_name")
            items = data.get("items") or []
            # gộp theo SKU
            agg = {}
            for it in items:
                if not isinstance(it, dict):
                    continue
                sku = it.get("sku")
                name = it.get("product_name")
                o = int(it.get("quantity_ordered") or 0)
                r = int(it.get("quantity_received") or 0)
                if sku not in agg:
                    agg[sku] = {"sku": sku, "product_name": name, "ordered": 0, "received": 0}
                agg[sku]["ordered"] += o
                agg[sku]["received"] += r
            lines = []
            for sku, row in list(agg.items())[:10]:
                lines.append(f"- {row['sku']} ({_s(row.get('product_name'))}): đã nhận {row['received']}/{row['ordered']}")
            head = f"Chi tiết PO {po} | Trạng thái: {_s(st)} | NCC: {_s(sup)}."
            return head + "\nDòng hàng (gộp theo SKU):\n" + _fmt_list(lines, 10)

        # PR / GR / GI dạng items
        if "pr_code" in data:
            pr = data.get("pr_code")
            st = data.get("status")
            items = data.get("items") or []
            lines = []
            for it in items[:10]:
                if isinstance(it, dict):
                    lines.append(f"- {it.get('sku')} ({_s(it.get('product_name'))}): SL yêu cầu {_s(it.get('quantity_requested'))}, cần trước {_s(it.get('expected_date'))}")
            return f"Chi tiết PR {pr} | Trạng thái: {_s(st)}.\nDòng hàng:\n{_fmt_list(lines, 10)}"

        if "gr_code" in data:
            gr = data.get("gr_code")
            st = data.get("status")
            wh = data.get("warehouse_name") or data.get("warehouse_code")
            items = data.get("items") or []
            lines = []
            for it in items[:10]:
                if isinstance(it, dict):
                    lines.append(f"- {it.get('sku')} ({_s(it.get('product_name'))}): đã nhập {_s(it.get('quantity_received'))}")
            return f"Chi tiết GR {gr} | Trạng thái: {_s(st)} | Kho: {_s(wh)}.\nDòng hàng:\n{_fmt_list(lines, 10)}"

        if "gi_code" in data:
            gi = data.get("gi_code")
            st = data.get("status")
            itype = data.get("issue_type")
            items = data.get("items") or []
            lines = []
            for it in items[:10]:
                if isinstance(it, dict):
                    lines.append(f"- {it.get('sku')} ({_s(it.get('product_name'))}): đã xuất {_s(it.get('quantity_issued'))}")
            return f"Chi tiết GI {gi} | Trạng thái: {_s(st)} | Loại: {_s(itype)}.\nDòng hàng:\n{_fmt_list(lines, 10)}"

    # -------------------------
    # 6) Dict: status PO/PR/GR/GI
    # -------------------------
    if isinstance(data, dict) and "po_code" in data and "status" in data:
        return (
            f"Đơn mua {data['po_code']} trạng thái: {data['status']}. "
            f"NCC: {_s(data.get('supplier_name') or data.get('supplier_code'))}. "
            f"Ngày đặt: {_s(data.get('order_date'))}. Dự kiến giao: {_s(data.get('expected_delivery_date'))}."
        )
    if isinstance(data, dict) and "pr_code" in data and "status" in data:
        return f"PR {data['pr_code']} trạng thái: {data['status']}. Ngày yêu cầu: {_s(data.get('request_date'))}."
    if isinstance(data, dict) and "gr_code" in data and "status" in data:
        return f"GR {data['gr_code']} trạng thái: {data['status']}. Ngày nhập: {_s(data.get('receipt_date'))}."
    if isinstance(data, dict) and "gi_code" in data and "status" in data:
        return f"GI {data['gi_code']} trạng thái: {data['status']}. Ngày xuất: {_s(data.get('issue_date'))}."

    # -------------------------
    # 7) List dict: render theo shape
    # -------------------------
    if isinstance(data, list) and data and all(isinstance(x, dict) for x in data):
        keys = set().union(*[set(x.keys()) for x in data[:5]])

        # 7.1) List tồn kho rút gọn (tra_ton_kho_theo_tu_khoa trả list)
        if {"sku", "product_name"}.issubset(keys) and any(k.startswith("total_") for k in keys):
            lines = []
            for x in data[:10]:
                lines.append(
                    f"- {x.get('sku')} ({_s(x.get('product_name'))}): "
                    f"khả dụng {_s(x.get('total_available'))}, giữ {_s(x.get('total_allocated'))}, tồn {_s(x.get('total_on_hand'))}"
                )
            return f"Tồn kho theo kết quả tìm kiếm (hiển thị {min(len(data),10)}/{len(data)}):\n{_fmt_list(lines, 10)}"

        # 7.2) Top xuất nhiều: sku + total_quantity_issued
        if {"sku", "product_name", "total_quantity_issued"}.issubset(keys):
            lines = []
            for i, x in enumerate(data[:10], start=1):
                lines.append(f"- {i}. {x.get('sku')} ({_s(x.get('product_name'))}): {_s(x.get('total_quantity_issued'))}")
            return f"Top {min(len(data),10)} sản phẩm xuất nhiều nhất:\n{_fmt_list(lines, 10)}"

        # 7.3) Ranking NCC: total_orders / total_receipts
        if {"supplier_code", "supplier_name"}.issubset(keys) and ("total_orders" in keys or "total_receipts" in keys):
            metric = "total_orders" if "total_orders" in keys else "total_receipts"
            metric_label = "số PO" if metric == "total_orders" else "số GR"
            lines = []
            for i, x in enumerate(data[:10], start=1):
                lines.append(f"- {i}. {x.get('supplier_code')} ({_s(x.get('supplier_name'))}): {_s(x.get(metric))} {metric_label}")
            return f"Xếp hạng nhà cung cấp theo {metric_label}:\n{_fmt_list(lines, 10)}"

        # 7.4) Thống kê theo ngày: date/day + total_*
        if ("date" in keys or "day" in keys) and any(k.startswith("total_") for k in keys):
            date_key = "date" if "date" in keys else "day"
            # lấy 1 key total_ đầu tiên
            total_keys = [k for k in keys if k.startswith("total_")]
            total_key = total_keys[0] if total_keys else None
            if total_key:
                lines = []
                for x in data[:10]:
                    lines.append(f"- {_s(x.get(date_key))}: {_s(x.get(total_key))}")
                return f"Thống kê theo ngày (hiển thị {min(len(data),10)}/{len(data)}):\n{_fmt_list(lines, 10)}"

        # 7.5) List PO: po_code + status
        if "po_code" in keys and "status" in keys:
            STATUS_VI = {
                "OPEN": "mở",
                "APPROVED": "đã duyệt",
                "PARTIAL_RECEIVED": "đã nhận một phần",
                "RECEIVED": "đã nhận đủ",
                "CANCELLED": "đã hủy",
            }
            lines = []
            for x in data[:10]:
                st = x.get("status")
                st_vi = STATUS_VI.get(st)
                st_disp = f"{st} ({st_vi})" if st and st_vi else (st or "N/A")
                lines.append(
                    f"- {x.get('po_code')} | {st_disp} | Ngày đặt {_s(x.get('order_date'))} | ETD {_s(x.get('expected_delivery_date'))}"
                )
            return f"Hiện có {len(data)} PO:\n" + _fmt_list(lines, 10)

        # 7.6) List log trực tiếp (trường hợp tool trả list)
        if "transaction_type" in keys and "quantity_change" in keys and "reference_code" in keys:
            lines = [
                f"- {_s(x.get('transaction_date'))} | {x.get('transaction_type')} | {x.get('sku')} | Δ {x.get('quantity_change')} | ref {x.get('reference_code')}"
                for x in data[:12]
            ]
            return "Log biến động tồn kho:\n" + _fmt_list(lines, 12)

        # 7.7) Generic list dict fallback
        common = set(data[0].keys())
        for x in data[1:5]:
            common &= set(x.keys())
        common_keys = [k for k in ["code", "sku", "po_code", "pr_code", "gr_code", "gi_code", "status", "date", "day"] if k in common]
        if not common_keys:
            # fallback: lấy tối đa 4 key phổ biến
            common_keys = list(common)[:4]

        lines = []
        for x in data[:10]:
            parts = []
            for k in common_keys[:4]:
                parts.append(f"{k}={_s(x.get(k))}")
            lines.append("- " + ", ".join(parts))
        return f"Danh sách kết quả (hiển thị {min(len(data),10)}/{len(data)}):\n{_fmt_list(lines, 10)}"

    return None



def _is_bad_answer(answer: str) -> bool:
    if not answer: return True
    if "..." in answer: return True
    if "{{" in answer or "}}" in answer: return True
    if "{s" in answer: return True
    return False

def _compose_po_deadline_progress(store: Dict[str, Any]) -> Optional[str]:
    s1 = store.get("s1")
    s2 = store.get("s2")
    if not (isinstance(s1, dict) and isinstance(s2, dict)):
        return None
    d1 = s1.get("data") or {}
    d2 = s2.get("data") or {}
    if not (isinstance(d1, dict) and isinstance(d2, dict)):
        return None
    if "po_code" not in d1 or "progress_percent" not in d2:
        return None

    po_code = d1.get("po_code")
    status = d1.get("status") or d2.get("status")
    etd = _s(d1.get("expected_delivery_date"))
    progress = d2.get("progress_percent")

    missing = d2.get("missing_items") or []
    if missing:
        lines = []
        for m in missing[:8]:
            lines.append(
                f"- {m.get('sku')} ({_s(m.get('product_name'))}): thiếu {m.get('missing')} "
                f"(đã nhận {m.get('received')}/{m.get('ordered')})"
            )
        missing_txt = "Còn thiếu:\n" + _fmt_list(lines, 8)
    else:
        missing_txt = "Không còn thiếu SKU nào (đã nhập đủ)."

    return (
        f"PO sắp đến hạn giao nhất là {po_code} ({status}), ETD {etd}. "
        f"Tiến độ nhập hiện {progress}%. {missing_txt}"
    )

def _compose_ok(ans: str) -> bool:
    if not ans:
        return False
    if "{{" in ans or "}}" in ans:
        return False
    if "{s" in ans:
        return False
    if "..." in ans:
        return False
    # giới hạn độ dài để tránh kể lể
    if len(ans) > 900:
        return False
    return True

# =========================
# FACTS preview for paraphrase
# =========================
def _drop_none(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}

def _filter_row(row: Dict[str, Any]) -> Dict[str, Any]:
    # heuristic chọn field phổ biến theo “shape”
    keys = set(row.keys())

    if "po_code" in keys:
        keep = ["po_code", "status", "order_date", "expected_delivery_date", "supplier_name", "supplier_code", "total_amount"]
    elif "pr_code" in keys:
        keep = ["pr_code", "status", "request_date"]
    elif "gr_code" in keys:
        keep = ["gr_code", "status", "receipt_date", "warehouse_code", "po_code", "supplier_name"]
    elif "gi_code" in keys:
        keep = ["gi_code", "status", "issue_date", "issue_type", "reference_doc_id", "warehouse_code"]
    elif "transaction_type" in keys and "quantity_change" in keys:
        keep = ["transaction_date", "transaction_type", "sku", "warehouse_code", "quantity_change", "reference_code"]
    elif "sku" in keys and ("available" in keys or "on_hand" in keys):
        keep = ["warehouse_code", "warehouse_name", "bin_code", "on_hand", "allocated", "available", "sku"]
    else:
        keep = list(row.keys())[:8]

    out = {}
    for k in keep:
        if k in row:
            out[k] = row.get(k)
    return _drop_none(out)

def _preview_data(data: Any, list_n: int = 6, nested_n: int = 6) -> Dict[str, Any]:
    # list output
    if isinstance(data, list):
        preview = []
        for r in data[:max(1, min(list_n, 20))]:
            if isinstance(r, dict):
                preview.append(_filter_row(r))
            else:
                preview.append(r)
        return {
            "type": "list",
            "total": len(data),
            "items_preview": preview
        }

    # object output
    if isinstance(data, dict):
        out: Dict[str, Any] = {"type": "object"}

        # core fields (không nhét cả object)
        core_keep = []
        if "sku" in data: core_keep += ["sku", "product_name", "total_on_hand", "total_allocated", "total_available"]
        if "po_code" in data: core_keep += ["po_code", "status", "order_date", "expected_delivery_date", "supplier_name", "supplier_code", "total_amount"]
        if "pr_code" in data: core_keep += ["pr_code", "status", "request_date"]
        if "gr_code" in data: core_keep += ["gr_code", "status", "receipt_date", "warehouse_code", "po_code", "supplier_name"]
        if "gi_code" in data: core_keep += ["gi_code", "status", "issue_date", "issue_type", "reference_doc_id", "warehouse_code"]
        if not core_keep:
            # fallback: lấy tối đa 8 field scalar
            for k, v in data.items():
                if isinstance(v, (str, int, float, bool)) or v is None:
                    core_keep.append(k)
                if len(core_keep) >= 8:
                    break

        core = {}
        for k in core_keep:
            if k in data:
                core[k] = data.get(k)
        out["core"] = _drop_none(core)

        # nested arrays preview
        if isinstance(data.get("items"), list):
            items = data["items"]
            out["items_total"] = len(items)
            out["items_preview"] = [_filter_row(x) for x in items[:max(1, min(nested_n, 20))] if isinstance(x, dict)]

        if isinstance(data.get("details"), list):
            details = data["details"]
            out["details_total"] = len(details)
            out["details_preview"] = [_filter_row(x) for x in details[:max(1, min(nested_n, 20))] if isinstance(x, dict)]

        if isinstance(data.get("logs"), list):
            logs = data["logs"]
            out["logs_total"] = len(logs)
            out["logs_preview"] = [_filter_row(x) for x in logs[:max(1, min(nested_n, 20))] if isinstance(x, dict)]


        if isinstance(data.get("sources"), list):
            srcs = data["sources"]
            out["sources_total"] = len(srcs)
            out["sources_preview"] = [
                _drop_none({"source": s.get("source"), "score": s.get("score")})
                for s in srcs[:max(1, min(4, len(srcs)))]
                if isinstance(s, dict)
            ]

        return out

    # primitive
    return {"type": type(data).__name__, "value": data}

def _build_facts_for_paraphrase(store: Dict[str, Any], list_n: int = 6, nested_n: int = 6) -> Dict[str, Any]:
    steps = []
    # gom s1..sN theo thứ tự thực thi
    i = 1
    while True:
        si = store.get(f"s{i}")
        if not isinstance(si, dict):
            break
        steps.append(_drop_none({
            "step": f"s{i}",
            "thong_diep": si.get("thong_diep"),
            "ok": si.get("ok"),
            "preview": _preview_data(si.get("data"), list_n=list_n, nested_n=nested_n)
        }))
        i += 1

    return _drop_none({
        "steps_total": len(steps),
        "steps": steps,
        "store_keys": list(store.keys())[:30],
    })

def _build_compose_payload(module: str, role: str | None, question: str, step_infos: list[dict], draft_answer: str | None):
    tool_results = []
    for si in step_infos:
        r = si.get("result")
        if isinstance(r, dict) and "data" in r:
            data = r.get("data")
        else:
            data = r

        tool_results.append({
            "step_id": si.get("id"),
            "tool": si.get("tool"),
            "args": si.get("args"),
            "ok": r.get("ok") if isinstance(r, dict) else None,
            "thong_diep": r.get("thong_diep") if isinstance(r, dict) else None,
            "data": _clip_data(data, list_n=12, nested_n=12),
        })

    return {
        "module": module,
        "role": role,
        "question": question,
        "draft_answer": draft_answer,
        "tool_results": tool_results,
    }


# =========================
# Main
# =========================
def execute_chat(
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
        facts_for_paraphrase = _build_facts_for_paraphrase(store, list_n=6, nested_n=6)
        answer_final = paraphrase_answer(answer, facts=facts_for_paraphrase, enabled=True)
    else:
        answer_final = answer

    return {"answer": answer_final, "data": store, "plan": plan.model_dump()}

# def execute_chat(
#     module: str,
#     user_id: int | None,
#     role: str | None,
#     message: str,
#     paraphrase_enabled: bool = True,
#     compose_enabled: bool = True,
# ):
#     if not check_role(module, role):
#         raise PermissionDenied(f"Role '{role}' không được phép dùng chatbot module '{module}'.")

#     auth = {"user_id": user_id, "role": role, "is_authenticated": True}
#     plan = plan_route(module=module, message=message, auth=auth)
#     audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

#     if plan.needs_clarification:
#         return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

#     validate_plan(plan)

#     store: Dict[str, Any] = {}
#     step_infos: list[dict] = []

#     for idx, step in enumerate(plan.steps, start=1):
#         tool = get_tool(plan.module, step.tool)
#         if tool is None:
#             raise ToolExecutionError(f"Không tìm thấy tool '{step.tool}' trong module '{plan.module}'.")

#         try:
#             resolved_args = _resolve_args(step.args, store)
#         except UnresolvedRefError as e:
#             # DỪNG CHUỖI TOOL: thường do list rỗng hoặc plan tham chiếu sai biến
#             audit({"event": "arg_unresolved_stop", "error": str(e), "step": step.model_dump() if hasattr(step, "model_dump") else str(step)})
#             break

#         audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": resolved_args})
#         result = _execute_tool(plan.module, tool, resolved_args)

#         audit({"event": "tool_result", "module": plan.module, "tool": step.tool, "result": result})

#         step_infos.append({"id": step.id, "tool": step.tool, "args": resolved_args, "result": result})

#         # needs_clarification từ tool
#         if isinstance(result, dict) and result.get("needs_clarification"):
#             return {"answer": result.get("question"), "candidates": result.get("candidates"), "plan": plan.model_dump()}

#         store[step.id] = result
#         store[f"s{idx}"] = result

#         if getattr(step, "save_as", None):
#             if isinstance(result, dict) and "data" in result:
#                 store[step.save_as] = result.get("data")
#                 store[f"{step.save_as}__raw"] = result
#             else:
#                 store[step.save_as] = result

#     # ===== Compose answer bằng LLM (CHO MỌI MODULE) =====
#     answer = None
#     composed_used = False

#     if compose_enabled:
#         try:
#             composed = compose_answer_with_llm(plan.module, message, step_infos)
#             if compose_safe_enough(composed):
#                 answer = composed
#                 composed_used = True
#         except Exception as e:
#             audit({"event": "compose_failed", "error": str(e)})

#     # ===== Fallback deterministic nếu LLM fail =====
#     if not answer:
#         parts = []
#         for i in range(1, len(step_infos) + 1):
#             si = store.get(f"s{i}")
#             if isinstance(si, dict):
#                 fb = _fallback_from_result(si)  # bạn đang có hàm này
#                 if fb and fb not in parts:
#                     parts.append(fb)
#         answer = "\n\n".join(parts[:2]) if parts else "Đã tra cứu xong."

#     # Nếu đã compose bằng LLM thì KHÔNG paraphrase nữa (tránh bị dài/hallucinate)
#     if paraphrase_enabled and not composed_used:
#         if composed_used:
#             # Đã dùng LLM để trả lời đúng trọng tâm rồi => không paraphrase để tránh "bịa thêm"
#             answer_final = answer
#         else:
#             facts_for_paraphrase = _build_facts_for_paraphrase(store, list_n=6, nested_n=6)
#             answer_final = paraphrase_answer(answer, facts=facts_for_paraphrase, enabled=paraphrase_enabled)


#     return {"answer": answer, "data": store, "plan": plan.model_dump()}

#     # =========================
#     # Compose answer cho intent multi-tool (demo đẹp)
#     # =========================

#     # 1) PO sắp đến hạn giao nhất + trạng thái (s1: tìm PO, s2: trạng thái PO)
#     if plan.intent == "po_sap_den_han_giao_nhat":
#         s1 = store.get("s1") if isinstance(store.get("s1"), dict) else {}
#         s2 = store.get("s2") if isinstance(store.get("s2"), dict) else {}
#         d1 = s1.get("data") if isinstance(s1, dict) else None
#         d2 = s2.get("data") if isinstance(s2, dict) else None

#         if isinstance(d1, dict) and isinstance(d2, dict):
#             po_code = d2.get("po_code") or d1.get("po_code")
#             status = d2.get("status") or d1.get("status")
#             order_date = d2.get("order_date") or d1.get("order_date")
#             etd = d2.get("expected_delivery_date") or d1.get("expected_delivery_date")

#             sup_name = d2.get("supplier_name") or d2.get("supplier_code")
#             total_amount = d2.get("total_amount")

#             answer = (
#                 f"PO {po_code} là đơn mua sắp đến hạn giao nhất.\n"
#                 f"- Trạng thái: {_s(status)}\n"
#                 f"- Ngày đặt: {_fmt_date_vi(order_date)}\n"
#                 f"- Dự kiến giao (ETD): {_fmt_date_vi(etd)}\n"
#                 f"- Nhà cung cấp: {_s(sup_name)}\n"
#                 f"- Tổng giá trị: {_s(total_amount)}"
#             )

#     # 2) PO sắp đến hạn giao nhất + tiến độ nhập + thiếu SKU (s1: tìm PO, s2: tiến độ nhập PO)
#     elif plan.intent == "po_sap_den_han_va_tien_do_nhap":
#         s1 = store.get("s1") if isinstance(store.get("s1"), dict) else {}
#         s2 = store.get("s2") if isinstance(store.get("s2"), dict) else {}
#         d1 = s1.get("data") if isinstance(s1, dict) else None
#         d2 = s2.get("data") if isinstance(s2, dict) else None

#         if isinstance(d1, dict) and isinstance(d2, dict):
#             po_code = d2.get("po_code") or d1.get("po_code")
#             status = d2.get("status") or d1.get("status")
#             order_date = d1.get("order_date")
#             etd = d1.get("expected_delivery_date")

#             progress = d2.get("progress_percent")
#             missing_items = d2.get("missing_items") or []

#             lines = []
#             # missing_items: [{sku, product_name, ordered, received, missing}]
#             for it in missing_items[:12]:
#                 if not isinstance(it, dict):
#                     continue
#                 sku = it.get("sku")
#                 name = it.get("product_name")
#                 ordered = it.get("ordered")
#                 received = it.get("received")
#                 missing = it.get("missing")
#                 lines.append(f"- {sku} ({_s(name)}): đã nhận {_s(received, 0)}/{_s(ordered, 0)}, thiếu {_s(missing, 0)}")

#             if lines:
#                 missing_text = "Các SKU còn thiếu:\n" + _fmt_list(lines, 12)
#             else:
#                 missing_text = "Các SKU còn thiếu: Không (đã nhận đủ)."

#             answer = (
#                 f"PO {po_code} là đơn mua sắp đến hạn giao nhất.\n"
#                 f"- Trạng thái: {_s(status)}\n"
#                 f"- Ngày đặt: {_fmt_date_vi(order_date)}\n"
#                 f"- Dự kiến giao (ETD): {_fmt_date_vi(etd)}\n"
#                 f"- Tiến độ nhập: {_s(progress)}%\n"
#                 f"{missing_text}"
#             )

#     # 3) NCC: hiệu suất giao hàng + GR gần nhất (s1: hiệu suất, s2: GR list)
#     elif plan.intent == "hieu_suat_va_gr_gan_day_theo_ncc":
#         s1 = store.get("s1") if isinstance(store.get("s1"), dict) else {}
#         s2 = store.get("s2") if isinstance(store.get("s2"), dict) else {}
#         d1 = s1.get("data") if isinstance(s1, dict) else None
#         d2 = s2.get("data") if isinstance(s2, dict) else None

#         if isinstance(d1, dict) and isinstance(d2, dict):
#             sup_code = d1.get("supplier_code") or d2.get("supplier_code")
#             sup_name = d1.get("supplier_name") or d2.get("supplier_name") or sup_code or "N/A"
#             total_receipts = d1.get("total_receipts")
#             limit = d2.get("limit")
#             total_returned = d2.get("total_returned")
#             gr_list = d2.get("gr_list") or []

#             lines = []
#             for x in gr_list[:10]:
#                 if not isinstance(x, dict):
#                     continue
#                 lines.append(
#                     f"- {x.get('gr_code')} | {x.get('status')} | {_fmt_date_vi(x.get('receipt_date'))} | PO {x.get('po_code')}"
#                 )

#             head = f"Nhà cung cấp {sup_name} ({sup_code}): tổng số phiếu nhập (GR) ghi nhận = {_s(total_receipts)}."
#             tail = f"Danh sách {limit} phiếu nhập gần nhất (trả về {_s(total_returned)}/{_s(limit)}):"
#             answer = head + "\n" + tail + ("\n" + _fmt_list(lines, 10) if lines else "\n- Không có phiếu nhập.")
#     elif plan.intent == "tra_cuu_po_nhan_mot_phan_va_doi_chieu_gr":
#         s1 = store.get("s1") if isinstance(store.get("s1"), dict) else {}
#         s2 = store.get("s2") if isinstance(store.get("s2"), dict) else {}
#         d1 = s1.get("data") if isinstance(s1, dict) else None   # list PO
#         d2 = s2.get("data") if isinstance(s2, dict) else None   # dict {po_code,status,items}

#         # s1: danh sách PO partial
#         if not isinstance(d1, list) or len(d1) == 0:
#             answer = "Không có PO nào đang nhận một phần (PARTIAL_RECEIVED)."
#         else:
#             # list PO codes để show
#             po_codes = []
#             for x in d1[:12]:
#                 if isinstance(x, dict) and x.get("po_code"):
#                     po_codes.append(x["po_code"])

#             head = f"Có {len(d1)} PO đang nhận một phần: " + (", ".join(po_codes[:8]) + ("..." if len(po_codes) > 8 else ""))

#             # s2: đối chiếu PO vs GR cho PO đầu tiên
#             if isinstance(d2, dict) and d2.get("po_code"):
#                 po_code = d2.get("po_code")
#                 status = d2.get("status")
#                 items = d2.get("items") or []

#                 # chỉ liệt kê các dòng thiếu (missing>0)
#                 missing_lines = []
#                 if isinstance(items, list):
#                     for it in items:
#                         if not isinstance(it, dict):
#                             continue
#                         missing = it.get("missing")
#                         if isinstance(missing, (int, float)) and missing > 0:
#                             missing_lines.append(
#                                 f"- {it.get('sku')} ({_s(it.get('product_name'))}): "
#                                 f"đã nhận {_s(it.get('received'), 0)}/{_s(it.get('ordered'), 0)}, thiếu {missing}"
#                             )

#                 if missing_lines:
#                     body = (
#                         f"Đối chiếu PO vs GR cho {po_code} | Trạng thái: {_s(status)}\n"
#                         "Các SKU còn thiếu:\n" + _fmt_list(missing_lines, 12)
#                     )
#                 else:
#                     body = f"Đối chiếu PO vs GR cho {po_code} | Trạng thái: {_s(status)}\nKhông còn SKU thiếu (đã nhận đủ)."

#                 answer = head + "\n" + body
#             else:
#                 answer = head + "\nKhông lấy được dữ liệu đối chiếu PO vs GR."

#     # Deterministic answer từ data thật (generic multi-step)
#     if _is_bad_answer(answer or ""):
#         parts = []

#         suppress = CONTEXT_ONLY_TOOLS_BY_MODULE.get(plan.module, set())
#         skip_employee = (plan.module == "hrm" and not _wants_employee_profile(message))

#         for i in range(1, len(plan.steps) + 1):
#             step = plan.steps[i - 1]
#             # Bỏ qua tool tra cứu nhân viên nếu user không hỏi hồ sơ
#             if skip_employee and step.tool in suppress:
#                 continue

#             si = store.get(f"s{i}")
#             if isinstance(si, dict):
#                 fb = _fallback_from_result(si)
#                 if fb and fb not in parts:
#                     parts.append(fb)

#         if parts:
#             # giới hạn để tránh quá dài
#             answer = "\n\n".join(parts[:3])

#     answer = answer or "Đã tra cứu xong."

#         # Compose cho intent multi-tool: hiệu suất NCC + GR gần nhất
#     if plan.intent == "hieu_suat_va_gr_gan_day_theo_ncc":
#         s1 = store.get("s1", {})
#         s2 = store.get("s2", {})
#         d1 = s1.get("data") if isinstance(s1, dict) else None
#         d2 = s2.get("data") if isinstance(s2, dict) else None

#         if isinstance(d1, dict) and isinstance(d2, dict):
#             sup = d1.get("supplier_name") or d1.get("supplier_code") or d2.get("supplier_name") or d2.get("supplier_code")
#             total_receipts = d1.get("total_receipts")
#             gr_list = d2.get("gr_list") or []
#             limit = d2.get("limit")
#             total_returned = d2.get("total_returned")

#             lines = []
#             for x in gr_list[:8]:
#                 lines.append(f"- {x.get('gr_code')} | {x.get('status')} | {x.get('receipt_date')} | PO {x.get('po_code')}")

#             answer = (
#                 f"Nhà cung cấp {sup}: tổng số phiếu nhập (GR) ghi nhận = {total_receipts}. "
#                 f"5 phiếu nhập gần nhất (trả về {total_returned}/{limit}):\n"
#                 + ("\n".join(lines) if lines else "Không có phiếu nhập.")
#             )


#     # ===== Layer B: LLM paraphrase + FACTS preview =====
#     facts_for_paraphrase = _build_facts_for_paraphrase(store, list_n=6, nested_n=6)
#     answer_final = paraphrase_answer(
#         answer,
#         facts=facts_for_paraphrase,
#         enabled=(paraphrase_enabled and (not composed_used))
#     )


#     return {"answer": answer_final, "data": store, "plan": plan.model_dump()}
