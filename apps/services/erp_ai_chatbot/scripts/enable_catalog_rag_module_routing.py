from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def write(rel_path: str, content: str):
    p = ROOT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"[WRITE] {rel_path}")

def main():
    # =========================
    # A) RAG KB folder
    # =========================
    write("app/knowledge_base/supply_chain/README.txt", """\
Đặt tài liệu dạng .txt vào thư mục này để tool tra_cuu_kho_tri_thuc dùng.
Ví dụ:
- tai_lieu_module_supply_chain.txt
- chinh_sach_bao_hanh.txt
- quy_trinh_nhap_xuat_kho.txt
""")

    # =========================
    # B) RAG tool: tra_cuu_kho_tri_thuc
    # =========================
    write("app/modules/supply_chain/tools/tra_cuu_kho_tri_thuc.py", r'''
from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any
from pydantic import BaseModel, Field

from app.ai.tooling import ToolSpec, ok, can_lam_ro

KB_DIR = Path(__file__).resolve().parents[3] / "knowledge_base" / "supply_chain"

class TraCuuKhoTriThucArgs(BaseModel):
    cau_hoi: str = Field(..., description="Câu hỏi về chính sách, hướng dẫn, FAQ, bảo hành/đổi trả/vận chuyển...")
    top_k: int = 4

def _tokenize(s: str) -> List[str]:
    s = (s or "").lower()
    # tách thô theo khoảng trắng, loại token ngắn
    toks = [t.strip(".,:;!?()[]{}\"'") for t in s.split()]
    toks = [t for t in toks if len(t) >= 2]
    return toks

def _score(text: str, toks: List[str]) -> int:
    t = text.lower()
    return sum(t.count(tok) for tok in toks)

def _snippet(text: str, toks: List[str], max_len: int = 420) -> str:
    t = text.lower()
    # tìm vị trí match đầu tiên
    pos = None
    for tok in toks:
        i = t.find(tok)
        if i != -1:
            pos = i
            break
    if pos is None:
        return (text[:max_len] + "...") if len(text) > max_len else text
    start = max(0, pos - 160)
    end = min(len(text), start + max_len)
    sn = text[start:end]
    if start > 0: sn = "..." + sn
    if end < len(text): sn = sn + "..."
    return sn

def tra_cuu_kho_tri_thuc(session, cau_hoi: str, top_k: int = 4):
    # session không dùng, để đồng nhất signature tool
    if not KB_DIR.exists():
        return can_lam_ro(
            "Chưa có kho tri thức. Bạn tạo thư mục app/knowledge_base/supply_chain và thêm file .txt vào đó.",
            []
        )

    files = sorted(KB_DIR.glob("*.txt"))
    if not files:
        return can_lam_ro(
            "Kho tri thức chưa có file .txt nào. Bạn copy tài liệu .txt vào app/knowledge_base/supply_chain.",
            []
        )

    toks = _tokenize(cau_hoi)
    if not toks:
        return can_lam_ro("Bạn nhập câu hỏi rõ hơn (có từ khóa chính).", [])

    scored: List[Dict[str, Any]] = []
    for fp in files:
        try:
            text = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        s = _score(text, toks)
        if s > 0:
            scored.append({
                "source": fp.name,
                "score": s,
                "snippet": _snippet(text, toks)
            })

    if not scored:
        return can_lam_ro(
            "Không tìm thấy nội dung phù hợp trong kho tri thức. Bạn thử nêu từ khóa cụ thể hơn.",
            [f.name for f in files]
        )

    scored.sort(key=lambda x: x["score"], reverse=True)
    top = scored[:max(1, min(int(top_k), 8))]

    # extractive answer: lấy snippet tốt nhất
    answer = top[0]["snippet"]

    return ok({
        "answer": answer,
        "sources": top
    }, "Tra cứu kho tri thức (RAG dạng trích đoạn).")

RAG_TOOLS = [
    ToolSpec(
        "tra_cuu_kho_tri_thuc",
        "Tra cứu kho tri thức (txt) cho chính sách/hướng dẫn/FAQ. Trả về trích đoạn + nguồn.",
        TraCuuKhoTriThucArgs,
        tra_cuu_kho_tri_thuc,
        "supply_chain"
    )
]
'''.lstrip())

    # =========================
    # C) Catalog query tool: thuc_hien_truy_van_danh_muc
    #    (1 tool -> nhiều nghiệp vụ DB, KHÔNG nhận SQL string)
    # =========================
    write("app/modules/supply_chain/tools/truy_van_danh_muc.py", r'''
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Any, Optional, Type, Callable, List
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro

# Reuse các handler đã có (không viết lại SQL)
from app.modules.supply_chain.tools.tra_cuu_ton_kho import tra_cuu_ton_kho_theo_sku, tong_hop_ton_kho, canh_bao_ton_kho
from app.modules.supply_chain.tools.tra_cuu_mua_hang import (
    tra_cuu_trang_thai_don_mua, chi_tiet_po, po_chua_hoan_tat, tien_do_nhap_po,
    tra_cuu_trang_thai_pr, chi_tiet_pr, pr_chua_xu_ly, danh_sach_bao_gia_theo_pr
)
from app.modules.supply_chain.tools.tra_cuu_nhap_kho import tra_cuu_trang_thai_gr, chi_tiet_gr, danh_sach_gr_theo_po, gr_gan_day
from app.modules.supply_chain.tools.tra_cuu_xuat_kho import tra_cuu_trang_thai_gi, chi_tiet_gi, danh_sach_gi_theo_loai
from app.modules.supply_chain.tools.tra_cuu_nha_cung_cap import ho_so_nha_cung_cap, lich_su_mua_ncc, do_tre_giao_hang_ncc
from app.modules.supply_chain.tools.truy_vet_bien_dong import log_bien_dong_ton_kho, truy_vet_theo_tham_chieu
from app.modules.supply_chain.tools.tra_cuu_kiem_ke import tra_cuu_trang_thai_kiem_ke, chi_tiet_kiem_ke, bao_cao_chenh_lech

from app.modules.supply_chain.models import Product

# -------- param models (tối thiểu, an toàn) --------
class DanhMucArgs(BaseModel):
    ma_truy_van: str = Field(..., description="Mã truy vấn trong catalog (whitelist)")
    tham_so: Dict[str, Any] = Field(default_factory=dict)

class SKUParams(BaseModel):
    sku: str
    ma_kho: Optional[str] = None

class MaKhoParams(BaseModel):
    ma_kho: Optional[str] = None

class CanhBaoParams(BaseModel):
    ma_kho: Optional[str] = None
    nguong_sap_het: int = 5
    he_so_ton_qua_nhieu: int = 10

class POParams(BaseModel):
    po_code: str

class PRParams(BaseModel):
    pr_code: str

class GRParams(BaseModel):
    gr_code: str

class GIParams(BaseModel):
    gi_code: str

class NCCParams(BaseModel):
    supplier_code: str
    limit: int = 10

class LogParams(BaseModel):
    sku: Optional[str] = None
    ma_kho: Optional[str] = None
    loai_giao_dich: Optional[str] = None
    limit: int = 20

class RefParams(BaseModel):
    reference_code: str
    limit: int = 50

class KiemKeParams(BaseModel):
    stocktake_code: str

class ThongTinSanPhamParams(BaseModel):
    sku: Optional[str] = None
    tu_khoa: Optional[str] = None
    limit: int = 5

@dataclass(frozen=True)
class QuerySpec:
    mo_ta: str
    param_model: Type[BaseModel]
    handler: Callable[..., Dict[str, Any]]

def _thong_tin_san_pham(session: Session, sku: Optional[str], tu_khoa: Optional[str], limit: int = 5):
    q = session.query(Product)
    if sku:
        p = q.filter(func.upper(Product.sku) == sku.strip().upper()).first()
        if not p:
            return can_lam_ro("Không tìm thấy SKU. Bạn kiểm tra lại.", [])
        return ok({
            "sku": p.sku,
            "product_name": p.product_name,
            "brand": p.brand,
            "category": p.category,
            "unit": p.unit,
            "barcode": p.barcode,
            "weight_kg": p.weight_kg,
            "dimension_cm": p.dimension_cm,
            "sale_price": str(p.sale_price) if p.sale_price is not None else None,
            "purchase_price": str(p.purchase_price) if p.purchase_price is not None else None,
            "min_stock_level": p.min_stock_level,
            "warranty_months": p.warranty_months
        }, "Thông tin sản phẩm.")
    if tu_khoa:
        rows = (
            q.filter(Product.product_name.ilike(f"%{tu_khoa.strip()}%"))
            .limit(max(1, min(int(limit), 20)))
            .all()
        )
        if not rows:
            return can_lam_ro("Không tìm thấy sản phẩm theo từ khóa.", [])
        return ok([{
            "sku": p.sku,
            "product_name": p.product_name,
            "brand": p.brand,
            "category": p.category,
            "sale_price": str(p.sale_price) if p.sale_price is not None else None,
            "warranty_months": p.warranty_months
        } for p in rows], "Danh sách sản phẩm theo từ khóa.")
    return can_lam_ro("Cần sku hoặc tu_khoa để tra thông tin sản phẩm.", [])

# -------- catalog whitelist (mặc định 10 mã truy vấn, bạn có thể thêm dần) --------
CATALOG: Dict[str, QuerySpec] = {
    # tồn kho
    "ton_kho_sku": QuerySpec("Tồn kho theo SKU (có thể lọc kho).", SKUParams, lambda session, **kw: tra_cuu_ton_kho_theo_sku(session, **kw)),
    "tong_hop_ton_kho": QuerySpec("Tổng hợp tồn kho.", MaKhoParams, lambda session, **kw: tong_hop_ton_kho(session, **kw)),
    "canh_bao_ton_kho": QuerySpec("Cảnh báo tồn kho sắp hết / tồn nhiều.", CanhBaoParams, lambda session, **kw: canh_bao_ton_kho(session, **kw)),

    # sản phẩm
    "thong_tin_san_pham": QuerySpec("Thông tin sản phẩm (theo SKU hoặc từ khóa).", ThongTinSanPhamParams, _thong_tin_san_pham),

    # mua hàng
    "trang_thai_po": QuerySpec("Trạng thái PO.", POParams, lambda session, **kw: tra_cuu_trang_thai_don_mua(session, **kw)),
    "chi_tiet_po": QuerySpec("Chi tiết PO.", POParams, lambda session, **kw: chi_tiet_po(session, **kw)),
    "tien_do_nhap_po": QuerySpec("Tiến độ nhập PO.", POParams, lambda session, **kw: tien_do_nhap_po(session, **kw)),

    # nhập/xuất kho
    "trang_thai_gr": QuerySpec("Trạng thái GR.", GRParams, lambda session, **kw: tra_cuu_trang_thai_gr(session, **kw)),
    "chi_tiet_gi": QuerySpec("Chi tiết GI.", GIParams, lambda session, **kw: chi_tiet_gi(session, **kw)),

    # truy vết/log
    "log_bien_dong": QuerySpec("Log biến động tồn kho (lọc SKU/kho/loại).", LogParams, lambda session, **kw: log_bien_dong_ton_kho(session, **kw)),
}

def thuc_hien_truy_van_danh_muc(session: Session, ma_truy_van: str, tham_so: Dict[str, Any]):
    key = (ma_truy_van or "").strip()
    if not key:
        return can_lam_ro("Thiếu ma_truy_van.", list(CATALOG.keys()))

    spec = CATALOG.get(key)
    if not spec:
        return can_lam_ro("ma_truy_van không hợp lệ. Bạn chọn trong danh sách.", list(CATALOG.keys()))

    try:
        params = spec.param_model.model_validate(tham_so or {})
    except Exception as e:
        return can_lam_ro(f"Tham số không hợp lệ cho '{key}': {e}", {"schema": list(spec.param_model.model_fields.keys())})

    # gọi handler đã whitelist
    return spec.handler(session=session, **params.model_dump())

DANH_MUC_TRUY_VAN_TOOLS = [
    ToolSpec(
        "thuc_hien_truy_van_danh_muc",
        "Tool tổng quát: thực hiện truy vấn theo danh mục (whitelist), không nhận SQL string.",
        DanhMucArgs,
        thuc_hien_truy_van_danh_muc,
        "supply_chain"
    )
]
'''.lstrip())

    # =========================
    # D) Register 2 tool mới vào Supply Chain
    # =========================
    write("app/modules/supply_chain/tools/__init__.py", r'''
from app.modules.supply_chain.tools.tra_cuu_ton_kho import TON_KHO_TOOLS
from app.modules.supply_chain.tools.tra_cuu_nhap_kho import NHAP_KHO_TOOLS
from app.modules.supply_chain.tools.tra_cuu_xuat_kho import XUAT_KHO_TOOLS
from app.modules.supply_chain.tools.tra_cuu_mua_hang import MUA_HANG_TOOLS
from app.modules.supply_chain.tools.tra_cuu_nha_cung_cap import NHA_CUNG_CAP_TOOLS
from app.modules.supply_chain.tools.truy_vet_bien_dong import TRUY_VET_TOOLS
from app.modules.supply_chain.tools.tra_cuu_kiem_ke import KIEM_KE_TOOLS

from app.modules.supply_chain.tools.truy_van_danh_muc import DANH_MUC_TRUY_VAN_TOOLS
from app.modules.supply_chain.tools.tra_cuu_kho_tri_thuc import RAG_TOOLS

SUPPLY_CHAIN_TOOLS = (
    DANH_MUC_TRUY_VAN_TOOLS
    + RAG_TOOLS
    + TON_KHO_TOOLS
    + NHAP_KHO_TOOLS
    + XUAT_KHO_TOOLS
    + MUA_HANG_TOOLS
    + NHA_CUNG_CAP_TOOLS
    + TRUY_VET_TOOLS
    + KIEM_KE_TOOLS
)
'''.lstrip())

    # =========================
    # E) Router: thêm điều hướng module + gợi ý RAG/catelog (Gemini vẫn lập plan)
    # =========================
    write("app/ai/router.py", r'''
from __future__ import annotations

import json
import os
from copy import deepcopy
from typing import Dict, Any

from dotenv import load_dotenv
from google import genai

from app.ai.plan_schema import Plan
from app.ai.module_registry import list_tools

load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

PLAN_JSON_SCHEMA_BASE: Dict[str, Any] = {
    "type": "object",
    "required": ["module", "intent", "needs_clarification", "steps"],
    "properties": {
        "module": {"type": "string"},
        "intent": {"type": "string"},
        "needs_clarification": {"type": "boolean"},
        "clarifying_question": {"type": ["string", "null"]},
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "tool", "args"],
                "properties": {
                    "id": {"type": "string"},
                    "tool": {"type": "string"},
                    "args": {"type": "object"},
                    "save_as": {"type": ["string", "null"]},
                },
            },
        },
        "final_response_template": {"type": ["string", "null"]},
    },
}

def _schema_for_module(module: str) -> Dict[str, Any]:
    schema = deepcopy(PLAN_JSON_SCHEMA_BASE)
    tool_names = [t.ten_tool for t in list_tools(module)]
    schema["properties"]["steps"]["items"]["properties"]["tool"]["enum"] = tool_names
    return schema

def _tool_catalog(module: str) -> str:
    tools = list_tools(module)
    if not tools:
        return "(module chưa có tools)"
    lines = []
    for t in tools:
        fields = []
        for name, f in t.args_model.model_fields.items():
            required = f.is_required()
            ann = getattr(f.annotation, "__name__", str(f.annotation))
            fields.append(f"{name}{'' if required else '?'}:{ann}")
        lines.append(f"- {t.ten_tool}: {t.mo_ta} | args: {', '.join(fields)}")
    return "\n".join(lines)

def _detect_other_module(message: str) -> str | None:
    m = (message or "").lower()
    # sale/crm: đơn hàng bán, khách hàng
    if any(k in m for k in ["đơn hàng", "khách hàng", "crm", "cskh", "voucher", "giỏ hàng", "đặt hàng"]):
        return "sale_crm"
    # hrm
    if any(k in m for k in ["nhân viên", "lương", "chấm công", "nghỉ phép", "phòng ban", "tuyển dụng"]):
        return "hrm"
    # finance
    if any(k in m for k in ["hóa đơn", "công nợ", "kế toán", "thu chi", "bút toán", "vat", "đối soát"]):
        return "finance_accounting"
    return None

def _should_use_rag(message: str) -> bool:
    m = (message or "").lower()
    return any(k in m for k in [
        "chính sách", "bảo hành", "đổi trả", "vận chuyển", "hướng dẫn", "faq", "quy trình"
    ])

def _build_system_instruction(module: str, auth: dict) -> str:
    parts = []
    parts.append("Bạn là Router cho chatbot ERP. Bạn KHÔNG trả lời người dùng trực tiếp.")
    parts.append("Bạn chỉ xuất 1 PLAN JSON theo schema (response_json_schema). Không thêm text ngoài JSON.")
    parts.append("")
    parts.append("Quy tắc:")
    parts.append("1) Chỉ dùng tools thuộc module hiện tại.")
    parts.append("2) Thiếu thông tin => needs_clarification=true và hỏi lại.")
    parts.append("3) Không bịa tên tool/args. Tool đã bị khóa enum.")
    parts.append("4) Placeholder truyền dữ liệu giữa steps chỉ dùng dạng: {{s1.data.xxx}} hoặc {{s1.data.items[0].sku}}")
    parts.append("")
    parts.append("Khuyến nghị chọn tool:")
    parts.append("- Tra cứu DB nhiều nghiệp vụ: ưu tiên tool thuc_hien_truy_van_danh_muc (ma_truy_van + tham_so).")
    parts.append("- Chính sách/hướng dẫn/FAQ: dùng tool tra_cuu_kho_tri_thuc.")
    parts.append("")
    parts.append("Tools khả dụng:")
    parts.append(_tool_catalog(module))
    return "\n".join(parts)

def plan_route(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()

    # Điều hướng module (chặn sớm, deterministic)
    other = _detect_other_module(msg)
    if other and other != module:
        return Plan(
            module=module,
            intent="dieu_huong_module",
            needs_clarification=True,
            clarifying_question=(
                f"Câu hỏi này thuộc module '{other}'. Bạn chuyển chatbot sang '{other}' để tra cứu chính xác."
            ),
            steps=[],
            final_response_template=None,
        )

    # Nếu là câu hỏi dạng policy/hướng dẫn -> gọi RAG trực tiếp (không cần Gemini lập kế hoạch phức tạp)
    if module == "supply_chain" and _should_use_rag(msg):
        return Plan(
            module=module,
            intent="rag",
            needs_clarification=False,
            steps=[{
                "id": "s1",
                "tool": "tra_cuu_kho_tri_thuc",
                "args": {"cau_hoi": msg, "top_k": 4}
            }],
            final_response_template=None
        )

    # Các module khác: hiện bạn đang làm supply_chain trước
    if module != "supply_chain":
        return Plan(
            module=module,
            intent="ngoai_pham_vi",
            needs_clarification=True,
            clarifying_question=(
                f"Bạn đang ở module '{module}'. Hiện mới triển khai đầy đủ cho module 'supply_chain'."
            ),
            steps=[],
            final_response_template=None,
        )

    sys = _build_system_instruction(module, auth)
    schema = _schema_for_module(module)

    resp = _client.models.generate_content(
        model=_GEMINI_MODEL,
        contents=f"USER_MESSAGE:\n{msg}",
        config={
            "system_instruction": sys,
            "temperature": 0,
            "response_mime_type": "application/json",
            "response_json_schema": schema,
        },
    )

    text = (resp.text or "").strip()
    if not text:
        return Plan(
            module=module,
            intent="router_error",
            needs_clarification=True,
            clarifying_question="Router không nhận được output từ Gemini. Bạn thử lại câu ngắn hơn.",
            steps=[],
            final_response_template=None,
        )

    try:
        data = json.loads(text)
        return Plan.model_validate(data)
    except Exception:
        try:
            return Plan.model_validate_json(text)
        except Exception:
            return Plan(
                module=module,
                intent="router_parse_error",
                needs_clarification=True,
                clarifying_question="Router không parse được PLAN JSON. Bạn thử hỏi lại ngắn hơn.",
                steps=[],
                final_response_template=None,
            )
'''.lstrip())

    # =========================
    # F) Executor: thêm fallback cho RAG + làm fallback dựa vào SHAPE (không phụ thuộc tên tool)
    # =========================
    write("app/ai/executor.py", r'''
from __future__ import annotations
import re
from typing import Any, Dict, Optional, List

from app.core.rbac import check_role
from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError
from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec

from app.db.supply_chain_database import SupplyChainSessionLocal

VAR_DBL_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}")
VAR_SGL_RE = re.compile(r"\{\s*(s[0-9]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}")

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

def _render_template(tpl: str, store: dict) -> str:
    def repl(match):
        path = match.group(1)
        try:
            val = _get_path(store, path)
            return "" if val is None else str(val)
        except Exception:
            return match.group(0)

    out = VAR_DBL_RE.sub(repl, tpl)
    out = VAR_SGL_RE.sub(repl, out)
    return out

def _resolve_args(args: Dict[str, Any], store: dict) -> Dict[str, Any]:
    out = {}
    for k, v in args.items():
        out[k] = _render_template(v, store) if isinstance(v, str) else v
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
    raise ToolExecutionError(f"Chưa hỗ trợ executor cho module '{module}'.")

def _s(v, default="N/A"):
    if v is None: return default
    if isinstance(v, str) and not v.strip(): return default
    return v

def _fmt_list(lines: List[str], limit: int = 7) -> str:
    if not lines: return ""
    shown = lines[:limit]
    more = len(lines) - len(shown)
    return "\n".join(shown) + (f"\n(+{more} dòng)" if more > 0 else "")

def _fallback_from_data(data: Any) -> Optional[str]:
    # ---- RAG ----
    if isinstance(data, dict) and "answer" in data and "sources" in data and isinstance(data["sources"], list):
        src_lines = []
        for s in data["sources"][:4]:
            if isinstance(s, dict):
                src_lines.append(f"- {s.get('source')}: {s.get('snippet')}")
        return f"{data.get('answer')}\n\nNguồn tham khảo:\n{_fmt_list(src_lines, 4)}"

    # ---- tồn kho (dict) ----
    if isinstance(data, dict) and {"sku","product_name","total_available","total_allocated","total_on_hand"}.issubset(data.keys()):
        return (
            f"Tồn kho SKU {data['sku']} ({data['product_name']}): "
            f"khả dụng {data['total_available']}, đang giữ {data['total_allocated']}, tồn {data['total_on_hand']}."
        )

    # ---- trạng thái PO/PR/GR/GI (dict có *_code + status) ----
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

    # ---- list dạng danh sách PO/PR/GR/GI/log ----
    if isinstance(data, list) and data and all(isinstance(x, dict) for x in data):
        keys = set().union(*[set(x.keys()) for x in data[:5]])

        if "po_code" in keys and "status" in keys:
            lines = [f"- {x.get('po_code')}: {x.get('status')} | ETD {_s(x.get('expected_delivery_date'))}" for x in data[:10]]
            return "Danh sách PO:\n" + _fmt_list(lines, 10)

        if "pr_code" in keys and "status" in keys:
            lines = [f"- {x.get('pr_code')}: {x.get('status')} | {_s(x.get('request_date'))}" for x in data[:10]]
            return "Danh sách PR:\n" + _fmt_list(lines, 10)

        if "gr_code" in keys and "status" in keys:
            lines = [f"- {x.get('gr_code')}: {x.get('status')} | {_s(x.get('receipt_date'))}" for x in data[:10]]
            return "Danh sách GR:\n" + _fmt_list(lines, 10)

        if "gi_code" in keys and "status" in keys:
            lines = [f"- {x.get('gi_code')}: {x.get('status')} | {_s(x.get('issue_date'))}" for x in data[:10]]
            return "Danh sách GI:\n" + _fmt_list(lines, 10)

        if "transaction_type" in keys and "quantity_change" in keys and "reference_code" in keys:
            lines = [f"- {_s(x.get('transaction_date'))} | {x.get('transaction_type')} | {x.get('sku')} | Δ {x.get('quantity_change')} | ref {x.get('reference_code')}" for x in data[:12]]
            return "Log biến động tồn kho:\n" + _fmt_list(lines, 12)

    return None

def _is_bad_answer(answer: str) -> bool:
    if not answer: return True
    if "..." in answer: return True
    if "{{" in answer or "}}" in answer: return True
    if "{s" in answer: return True
    return False

def execute_chat(module: str, user_id: int | None, role: str | None, message: str):
    if not check_role(module, role):
        raise PermissionDenied(f"Role '{role}' không được phép dùng chatbot module '{module}'.")

    auth = {"user_id": user_id, "role": role, "is_authenticated": True}
    plan = plan_route(module=module, message=message, auth=auth)
    audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

    if plan.needs_clarification:
        return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

    validate_plan(plan)

    store: Dict[str, Any] = {}
    for step in plan.steps:
        tool = get_tool(plan.module, step.tool)
        if tool is None:
            raise ToolExecutionError(f"Không tìm thấy tool '{step.tool}' trong module '{plan.module}'.")

        resolved_args = _resolve_args(step.args, store)
        audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": resolved_args})

        result = _execute_tool(plan.module, tool, resolved_args)
        audit({"event": "tool_result", "module": plan.module, "tool": step.tool, "result": result})

        if isinstance(result, dict) and result.get("needs_clarification"):
            return {"answer": result.get("question"), "candidates": result.get("candidates"), "plan": plan.model_dump()}

        store[step.id] = result
        if step.save_as:
            store[step.save_as] = result

    answer = None
    if plan.final_response_template:
        answer = _render_template(plan.final_response_template, store)

    # Fallback: sinh câu trả lời quyết định dựa trên data thật từ tool
    if _is_bad_answer(answer or ""):
        s1 = store.get("s1")
        if isinstance(s1, dict):
            data = s1.get("data")
            fb = _fallback_from_data(data)
            if fb:
                answer = fb

    return {"answer": answer or "Đã tra cứu xong.", "data": store, "plan": plan.model_dump()}
'''.lstrip())

    print("\nDONE: Đã bật đủ 3 mục: Catalog Query tool + RAG tool + điều hướng module (router) + fallback answer (executor).")
    print("Nhớ restart uvicorn.")

if __name__ == "__main__":
    main()
