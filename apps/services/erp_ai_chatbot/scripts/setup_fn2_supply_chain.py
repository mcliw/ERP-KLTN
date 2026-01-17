from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def write(rel_path: str, content: str):
    p = ROOT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"[WRITE] {rel_path}")

def main():
    # -------------------------
    # app/ai/tooling.py
    # -------------------------
    write("app/ai/tooling.py", r'''
from __future__ import annotations
from dataclasses import dataclass
from typing import Callable, Type, Any, Dict, Optional
from pydantic import BaseModel

@dataclass(frozen=True)
class ToolSpec:
    ten_tool: str                      # tên tool (tiếng Việt, dùng trong plan)
    mo_ta: str
    args_model: Type[BaseModel]
    handler: Callable[..., Dict[str, Any]]
    module: str                        # hrm | sale_crm | finance_accounting | supply_chain
    read_only: bool = True

def ok(data: Any = None, thong_diep: str | None = None) -> Dict[str, Any]:
    return {"ok": True, "data": data, "thong_diep": thong_diep}

def can_lam_ro(cau_hoi: str, goi_y: Any = None) -> Dict[str, Any]:
    return {"ok": False, "needs_clarification": True, "question": cau_hoi, "candidates": goi_y}
'''.lstrip())

    # -------------------------
    # app/ai/plan_schema.py (update: add final_response_template)
    # -------------------------
    write("app/ai/plan_schema.py", r'''
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

class PlanStep(BaseModel):
    id: str
    tool: str
    args: Dict[str, Any]
    save_as: Optional[str] = None

class Plan(BaseModel):
    module: str
    intent: str
    needs_clarification: bool = False
    clarifying_question: Optional[str] = None
    steps: List[PlanStep] = Field(default_factory=list)
    final_response_template: Optional[str] = None
'''.lstrip())

    # -------------------------
    # app/ai/plan_validator.py
    # -------------------------
    write("app/ai/plan_validator.py", r'''
from __future__ import annotations
from typing import Dict
from app.ai.plan_schema import Plan
from app.core.errors import InvalidPlan
from app.ai.module_registry import get_tool

def validate_plan(plan: Plan):
    if not plan.module:
        raise InvalidPlan("Thiếu module trong plan.")
    if plan.needs_clarification:
        return

    if not plan.steps:
        raise InvalidPlan("Plan không có bước thực thi (steps rỗng).")

    # validate tool exists and belongs to module
    for step in plan.steps:
        tool = get_tool(plan.module, step.tool)
        if tool is None:
            raise InvalidPlan(f"Tool '{step.tool}' không tồn tại trong module '{plan.module}'.")
'''.lstrip())

    # -------------------------
    # app/ai/module_registry.py (register Supply Chain tools)
    # -------------------------
    write("app/ai/module_registry.py", r'''
from __future__ import annotations
from typing import Dict, Optional
from app.ai.tooling import ToolSpec

_MODULE_TOOLS: Dict[str, Dict[str, ToolSpec]] = {
    "hrm": {},
    "sale_crm": {},
    "finance_accounting": {},
    "supply_chain": {},
}

def register_tools(module: str, tools: list[ToolSpec]):
    if module not in _MODULE_TOOLS:
        _MODULE_TOOLS[module] = {}
    for t in tools:
        _MODULE_TOOLS[module][t.ten_tool] = t

def get_tool(module: str, ten_tool: str) -> Optional[ToolSpec]:
    return _MODULE_TOOLS.get(module, {}).get(ten_tool)

def list_tools(module: str) -> list[ToolSpec]:
    return list(_MODULE_TOOLS.get(module, {}).values())

# auto register supply_chain tools
try:
    from app.modules.supply_chain.tools import SUPPLY_CHAIN_TOOLS
    register_tools("supply_chain", SUPPLY_CHAIN_TOOLS)
except Exception as e:
    # khi chưa tạo tools, hệ thống vẫn chạy được
    pass
'''.lstrip())

    # -------------------------
    # app/ai/router.py (temporary rule-based router for supply_chain to test FN-2)
    # bạn sẽ thay bằng Gemini sau; hiện giúp bạn test tools end-to-end.
    # -------------------------
    write("app/ai/router.py", r'''
from __future__ import annotations
import re
from app.ai.plan_schema import Plan

SKU_RE = re.compile(r"\b[A-Z0-9]{2,}[-A-Z0-9]{2,}\b")

def plan_route(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()

    # Nếu không phải supply_chain, hiện chưa triển khai FN-2 => hỏi lại
    if module != "supply_chain":
        return Plan(
            module=module,
            intent="ngoai_pham_vi",
            needs_clarification=True,
            clarifying_question=f"Bạn đang ở module '{module}'. Hiện mình mới triển khai FN-2 cho module 'supply_chain'."
        )

    # ====== SUPPLY CHAIN: routing đơn giản để test ======
    # 1) Tồn kho
    if "tồn kho" in msg.lower() or "còn hàng" in msg.lower() or "hết hàng" in msg.lower():
        sku = None
        m = SKU_RE.search(msg.upper())
        if m:
            sku = m.group(0)
            return Plan(
                module=module,
                intent="tra_cuu_ton_kho",
                steps=[{
                    "id": "s1",
                    "tool": "tra_cuu_ton_kho_theo_sku",
                    "args": {"sku": sku}
                }],
                final_response_template="Tồn kho SKU {{s1.data.sku}} ({{s1.data.product_name}}): khả dụng {{s1.data.total_available}}, đang giữ {{s1.data.total_allocated}}, tồn {{s1.data.total_on_hand}}."
            )
        # fallback theo tên
        return Plan(
            module=module,
            intent="tra_cuu_ton_kho",
            needs_clarification=True,
            clarifying_question="Bạn vui lòng cung cấp SKU (vd: IP15-128) để tra tồn kho chính xác."
        )

    # 2) Trạng thái PO
    if "po-" in msg.lower() or "đơn mua" in msg.lower():
        code = None
        m = re.search(r"\bPO-\d{4}\d{4}\b", msg.upper().replace(" ", ""))
        if m:
            code = m.group(0)
            return Plan(
                module=module,
                intent="tra_cuu_don_mua",
                steps=[{
                    "id": "s1",
                    "tool": "tra_cuu_trang_thai_don_mua",
                    "args": {"po_code": code}
                }],
                final_response_template="Đơn mua {{s1.data.po_code}} trạng thái: {{s1.data.status}}. NCC: {{s1.data.supplier_name}}. Tổng tiền: {{s1.data.total_amount}}."
            )
        return Plan(
            module=module,
            intent="tra_cuu_don_mua",
            needs_clarification=True,
            clarifying_question="Bạn cung cấp mã PO theo dạng PO-2025xxxx để mình tra trạng thái."
        )

    # 3) Trạng thái GR/GI
    if "gr-" in msg.lower() or "phiếu nhập" in msg.lower():
        return Plan(
            module=module,
            intent="tra_cuu_phieu_nhap",
            needs_clarification=True,
            clarifying_question="Bạn cung cấp mã GR theo dạng GR-2025xxxx để mình tra."
        )

    if "gi-" in msg.lower() or "phiếu xuất" in msg.lower():
        return Plan(
            module=module,
            intent="tra_cuu_phieu_xuat",
            needs_clarification=True,
            clarifying_question="Bạn cung cấp mã GI theo dạng GI-2025xxxx để mình tra."
        )

    return Plan(
        module=module,
        intent="chua_ho_tro",
        needs_clarification=True,
        clarifying_question="Bạn đang ở module Supply Chain. Bạn muốn tra: tồn kho (SKU), PO, GR, GI, NCC, log biến động hay kiểm kê?"
    )
'''.lstrip())

    # -------------------------
    # app/ai/executor.py (Router + Executor + tool-chaining)
    # -------------------------
    write("app/ai/executor.py", r'''
from __future__ import annotations
import re
from typing import Any, Dict
from app.core.rbac import check_role
from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError
from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec

from app.db.supply_chain_database import SupplyChainSessionLocal

VAR_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}")

def _get_path(store: dict, path: str):
    # path example: s1.data.total_available OR s1.data.items[0].sku
    cur: Any = store
    tokens = []
    # split by dots but keep [idx]
    for part in path.split("."):
        tokens.append(part)

    for t in tokens:
        # handle [idx]
        m = re.match(r"^([a-zA-Z0-9_]+)(\[[0-9]+\])?$", t)
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
    return VAR_RE.sub(repl, tpl)

def _resolve_args(args: Dict[str, Any], store: dict) -> Dict[str, Any]:
    out = {}
    for k, v in args.items():
        if isinstance(v, str):
            out[k] = _render_template(v, store)
        else:
            out[k] = v
    return out

def _execute_tool(module: str, tool: ToolSpec, args: Dict[str, Any]) -> Dict[str, Any]:
    # FN-2 supply_chain: dùng session theo tool call
    if module == "supply_chain":
        session = SupplyChainSessionLocal()
        try:
            parsed = tool.args_model.model_validate(args)
            result = tool.handler(session=session, **parsed.model_dump())
            return result
        except Exception as e:
            raise ToolExecutionError(str(e))
        finally:
            session.close()

    raise ToolExecutionError(f"Chưa hỗ trợ executor cho module '{module}'.")

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

        # Stop if tool requests clarification
        if isinstance(result, dict) and result.get("needs_clarification"):
            return {"answer": result.get("question"), "candidates": result.get("candidates"), "plan": plan.model_dump()}

        # Save result under step id AND optional save_as
        store[step.id] = result
        if step.save_as:
            store[step.save_as] = result

    if plan.final_response_template:
        answer = _render_template(plan.final_response_template, store)
        return {"answer": answer, "data": store, "plan": plan.model_dump()}

    # fallback
    return {"answer": "Đã tra cứu xong.", "data": store, "plan": plan.model_dump()}
'''.lstrip())

    # -------------------------
    # Supply Chain tools
    # -------------------------
    write("app/modules/supply_chain/tools/__init__.py", r'''
from app.modules.supply_chain.tools.tra_cuu_ton_kho import TON_KHO_TOOLS
from app.modules.supply_chain.tools.tra_cuu_nhap_kho import NHAP_KHO_TOOLS
from app.modules.supply_chain.tools.tra_cuu_xuat_kho import XUAT_KHO_TOOLS
from app.modules.supply_chain.tools.tra_cuu_mua_hang import MUA_HANG_TOOLS
from app.modules.supply_chain.tools.tra_cuu_nha_cung_cap import NHA_CUNG_CAP_TOOLS
from app.modules.supply_chain.tools.truy_vet_bien_dong import TRUY_VET_TOOLS
from app.modules.supply_chain.tools.tra_cuu_kiem_ke import KIEM_KE_TOOLS

SUPPLY_CHAIN_TOOLS = (
    TON_KHO_TOOLS
    + NHAP_KHO_TOOLS
    + XUAT_KHO_TOOLS
    + MUA_HANG_TOOLS
    + NHA_CUNG_CAP_TOOLS
    + TRUY_VET_TOOLS
    + KIEM_KE_TOOLS
)
'''.lstrip())

    # -------------------------
    # app/modules/supply_chain/tools/_helpers.py
    # -------------------------
    write("app/modules/supply_chain/tools/_helpers.py", r'''
from __future__ import annotations
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.modules.supply_chain.models import Product, Warehouse, Supplier

def tim_san_pham_theo_sku_or_ten(session: Session, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
    kw = (keyword or "").strip()
    if not kw:
        return []
    q = (
        session.query(Product)
        .filter((func.upper(Product.sku) == kw.upper()) | (Product.product_name.ilike(f"%{kw}%")))
        .limit(limit)
    )
    return [
        {"product_id": p.product_id, "sku": p.sku, "product_name": p.product_name}
        for p in q.all()
    ]

def tim_kho_theo_ma_or_ten(session: Session, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
    kw = (keyword or "").strip()
    if not kw:
        return []
    q = (
        session.query(Warehouse)
        .filter((func.upper(Warehouse.warehouse_code) == kw.upper()) | (Warehouse.warehouse_name.ilike(f"%{kw}%")))
        .limit(limit)
    )
    return [
        {"warehouse_id": w.warehouse_id, "warehouse_code": w.warehouse_code, "warehouse_name": w.warehouse_name}
        for w in q.all()
    ]

def tim_ncc_theo_ma_or_ten(session: Session, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
    kw = (keyword or "").strip()
    if not kw:
        return []
    q = (
        session.query(Supplier)
        .filter((func.upper(Supplier.supplier_code) == kw.upper()) | (Supplier.supplier_name.ilike(f"%{kw}%")))
        .limit(limit)
    )
    return [
        {"supplier_id": s.supplier_id, "supplier_code": s.supplier_code, "supplier_name": s.supplier_name}
        for s in q.all()
    ]
'''.lstrip())

    # -------------------------
    # Tồn kho tools
    # -------------------------
    write("app/modules/supply_chain/tools/tra_cuu_ton_kho.py", r'''
from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import CurrentStock, Product, Warehouse, BinLocation
from app.modules.supply_chain.tools._helpers import tim_san_pham_theo_sku_or_ten, tim_kho_theo_ma_or_ten

# ===== Args schemas =====
class TimSanPhamArgs(BaseModel):
    tu_khoa: str = Field(..., description="SKU hoặc tên sản phẩm")

class TimKhoArgs(BaseModel):
    tu_khoa: str = Field(..., description="Mã kho hoặc tên kho")

class TraCuuTonKhoTheoSkuArgs(BaseModel):
    sku: str
    ma_kho: Optional[str] = None  # warehouse_code

class TraCuuTonKhoTheoTenArgs(BaseModel):
    ten_san_pham: str
    ma_kho: Optional[str] = None

class TongHopTonKhoArgs(BaseModel):
    ma_kho: Optional[str] = None

class CanhBaoTonKhoArgs(BaseModel):
    ma_kho: Optional[str] = None
    nguong_sap_het: int = 5
    he_so_ton_qua_nhieu: int = 10

# ===== Handlers =====
def tim_san_pham(session: Session, tu_khoa: str):
    matches = tim_san_pham_theo_sku_or_ten(session, tu_khoa, limit=10)
    if not matches:
        return can_lam_ro("Không tìm thấy sản phẩm. Bạn kiểm tra lại SKU hoặc tên sản phẩm.", [])
    return ok(matches, "Danh sách sản phẩm khớp từ khóa.")

def tim_kho(session: Session, tu_khoa: str):
    matches = tim_kho_theo_ma_or_ten(session, tu_khoa, limit=10)
    if not matches:
        return can_lam_ro("Không tìm thấy kho. Bạn kiểm tra lại mã kho hoặc tên kho.", [])
    return ok(matches, "Danh sách kho khớp từ khóa.")

def _tra_ton(session: Session, product_id: int, warehouse_id: Optional[int] = None):
    q = (
        session.query(
            Product.sku.label("sku"),
            Product.product_name.label("product_name"),
            Warehouse.warehouse_code.label("warehouse_code"),
            Warehouse.warehouse_name.label("warehouse_name"),
            BinLocation.bin_code.label("bin_code"),
            CurrentStock.quantity_on_hand.label("on_hand"),
            CurrentStock.quantity_allocated.label("allocated"),
        )
        .join(CurrentStock, CurrentStock.product_id == Product.product_id)
        .join(Warehouse, Warehouse.warehouse_id == CurrentStock.warehouse_id)
        .outerjoin(BinLocation, BinLocation.bin_id == CurrentStock.bin_id)
        .filter(Product.product_id == product_id)
    )
    if warehouse_id is not None:
        q = q.filter(CurrentStock.warehouse_id == warehouse_id)

    rows = q.all()
    if not rows:
        return {
            "sku": None, "product_name": None,
            "total_on_hand": 0, "total_allocated": 0, "total_available": 0,
            "details": []
        }

    total_on_hand = sum(int(r.on_hand or 0) for r in rows)
    total_allocated = sum(int(r.allocated or 0) for r in rows)
    total_available = total_on_hand - total_allocated

    details = []
    for r in rows:
        on_hand = int(r.on_hand or 0)
        allocated = int(r.allocated or 0)
        details.append({
            "warehouse_code": r.warehouse_code,
            "warehouse_name": r.warehouse_name,
            "bin_code": r.bin_code,
            "on_hand": on_hand,
            "allocated": allocated,
            "available": on_hand - allocated,
        })

    return {
        "sku": rows[0].sku,
        "product_name": rows[0].product_name,
        "total_on_hand": total_on_hand,
        "total_allocated": total_allocated,
        "total_available": total_available,
        "details": details
    }

def tra_cuu_ton_kho_theo_sku(session: Session, sku: str, ma_kho: Optional[str] = None):
    sku_norm = (sku or "").strip().upper()
    p = session.query(Product).filter(func.upper(Product.sku) == sku_norm).first()
    if not p:
        # gợi ý tìm gần đúng theo tên/sku
        g = tim_san_pham_theo_sku_or_ten(session, sku_norm, limit=10)
        return can_lam_ro("Không tìm thấy SKU chính xác. Bạn chọn một sản phẩm trong danh sách gợi ý.", g)

    warehouse_id = None
    if ma_kho:
        w = session.query(Warehouse).filter(func.upper(Warehouse.warehouse_code) == ma_kho.strip().upper()).first()
        if not w:
            gk = tim_kho_theo_ma_or_ten(session, ma_kho, limit=10)
            return can_lam_ro("Không tìm thấy mã kho. Bạn chọn kho trong danh sách gợi ý.", gk)
        warehouse_id = w.warehouse_id

    data = _tra_ton(session, product_id=p.product_id, warehouse_id=warehouse_id)
    data["sku"] = p.sku
    data["product_name"] = p.product_name
    return ok(data, "Đã tra cứu tồn kho theo SKU.")

def tra_cuu_ton_kho_theo_ten(session: Session, ten_san_pham: str, ma_kho: Optional[str] = None):
    matches = tim_san_pham_theo_sku_or_ten(session, ten_san_pham, limit=10)
    if not matches:
        return can_lam_ro("Không tìm thấy sản phẩm theo tên. Bạn nhập lại tên hoặc SKU.", [])
    if len(matches) > 1:
        return can_lam_ro("Có nhiều sản phẩm khớp. Bạn chọn đúng sản phẩm.", matches)

    sku = matches[0]["sku"]
    return tra_cuu_ton_kho_theo_sku(session, sku=sku, ma_kho=ma_kho)

def tong_hop_ton_kho(session: Session, ma_kho: Optional[str] = None):
    q = (
        session.query(
            Product.sku,
            Product.product_name,
            func.sum(CurrentStock.quantity_on_hand).label("total_on_hand"),
            func.sum(CurrentStock.quantity_allocated).label("total_allocated"),
        )
        .join(CurrentStock, CurrentStock.product_id == Product.product_id)
        .group_by(Product.sku, Product.product_name)
    )

    if ma_kho:
        w = session.query(Warehouse).filter(func.upper(Warehouse.warehouse_code) == ma_kho.strip().upper()).first()
        if not w:
            gk = tim_kho_theo_ma_or_ten(session, ma_kho, limit=10)
            return can_lam_ro("Không tìm thấy mã kho. Bạn chọn kho trong danh sách gợi ý.", gk)
        q = q.filter(CurrentStock.warehouse_id == w.warehouse_id)

    rows = q.all()
    data = []
    for r in rows:
        on_hand = int(r.total_on_hand or 0)
        allocated = int(r.total_allocated or 0)
        data.append({
            "sku": r.sku,
            "product_name": r.product_name,
            "total_on_hand": on_hand,
            "total_allocated": allocated,
            "total_available": on_hand - allocated
        })
    return ok(data, "Tổng hợp tồn kho (theo sản phẩm).")

def canh_bao_ton_kho(session: Session, ma_kho: Optional[str], nguong_sap_het: int, he_so_ton_qua_nhieu: int):
    # cảnh báo theo available so với min_stock_level
    base_q = (
        session.query(
            Product.sku,
            Product.product_name,
            Product.min_stock_level,
            func.sum(CurrentStock.quantity_on_hand).label("total_on_hand"),
            func.sum(CurrentStock.quantity_allocated).label("total_allocated"),
        )
        .join(CurrentStock, CurrentStock.product_id == Product.product_id)
        .group_by(Product.sku, Product.product_name, Product.min_stock_level)
    )

    if ma_kho:
        w = session.query(Warehouse).filter(func.upper(Warehouse.warehouse_code) == ma_kho.strip().upper()).first()
        if not w:
            gk = tim_kho_theo_ma_or_ten(session, ma_kho, limit=10)
            return can_lam_ro("Không tìm thấy mã kho. Bạn chọn kho trong danh sách gợi ý.", gk)
        base_q = base_q.filter(CurrentStock.warehouse_id == w.warehouse_id)

    rows = base_q.all()
    sap_het = []
    ton_qua_nhieu = []
    for r in rows:
        on_hand = int(r.total_on_hand or 0)
        allocated = int(r.total_allocated or 0)
        available = on_hand - allocated
        min_level = int(r.min_stock_level or 0)

        if available <= max(nguong_sap_het, min_level):
            sap_het.append({"sku": r.sku, "product_name": r.product_name, "available": available, "min_stock_level": min_level})
        if min_level > 0 and available >= min_level * he_so_ton_qua_nhieu:
            ton_qua_nhieu.append({"sku": r.sku, "product_name": r.product_name, "available": available, "min_stock_level": min_level})

    return ok({
        "sap_het": sap_het,
        "ton_qua_nhieu": ton_qua_nhieu
    }, "Cảnh báo tồn kho (sắp hết / tồn quá nhiều).")

# ===== Tool registry =====
TON_KHO_TOOLS = [
    ToolSpec("tim_san_pham", "Tìm sản phẩm theo SKU hoặc tên (để chọn đúng thực thể).", TimSanPhamArgs, tim_san_pham, "supply_chain"),
    ToolSpec("tim_kho", "Tìm kho theo mã kho hoặc tên kho.", TimKhoArgs, tim_kho, "supply_chain"),
    ToolSpec("tra_cuu_ton_kho_theo_sku", "Tra cứu tồn kho theo SKU (có thể lọc theo kho).", TraCuuTonKhoTheoSkuArgs, tra_cuu_ton_kho_theo_sku, "supply_chain"),
    ToolSpec("tra_cuu_ton_kho_theo_ten", "Tra cứu tồn kho theo tên sản phẩm (nếu mơ hồ sẽ yêu cầu chọn).", TraCuuTonKhoTheoTenArgs, tra_cuu_ton_kho_theo_ten, "supply_chain"),
    ToolSpec("tong_hop_ton_kho", "Tổng hợp tồn kho toàn hệ thống hoặc theo kho.", TongHopTonKhoArgs, tong_hop_ton_kho, "supply_chain"),
    ToolSpec("canh_bao_ton_kho", "Cảnh báo tồn kho: sắp hết / tồn quá nhiều.", CanhBaoTonKhoArgs, canh_bao_ton_kho, "supply_chain"),
]
'''.lstrip())

    # -------------------------
    # Nhập kho tools (GR)
    # -------------------------
    write("app/modules/supply_chain/tools/tra_cuu_nhap_kho.py", r'''
from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import GoodsReceipt, GRItem, PurchaseOrder, Supplier, Warehouse, Product

class TraCuuTrangThaiGRArgs(BaseModel):
    gr_code: str

class ChiTietGRArgs(BaseModel):
    gr_code: str

class DanhSachGRTheoPOArgs(BaseModel):
    po_code: str

class DanhSachGRTheoNCCArgs(BaseModel):
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    limit: int = 10

class GRGanDayArgs(BaseModel):
    limit: int = 10

def tra_cuu_trang_thai_gr(session: Session, gr_code: str):
    code = gr_code.strip().upper()
    gr = session.query(GoodsReceipt).filter(func.upper(GoodsReceipt.gr_code) == code).first()
    if not gr:
        return can_lam_ro("Không tìm thấy phiếu nhập (GR). Bạn kiểm tra lại mã GR.", [])
    return ok({
        "gr_code": gr.gr_code,
        "status": gr.status,
        "po_id": gr.po_id,
        "warehouse_id": gr.warehouse_id,
        "receipt_date": gr.receipt_date.isoformat() if gr.receipt_date else None
    }, "Trạng thái GR.")

def chi_tiet_gr(session: Session, gr_code: str):
    code = gr_code.strip().upper()
    gr = session.query(GoodsReceipt).filter(func.upper(GoodsReceipt.gr_code) == code).first()
    if not gr:
        return can_lam_ro("Không tìm thấy phiếu nhập (GR).", [])
    po = session.query(PurchaseOrder).filter(PurchaseOrder.po_id == gr.po_id).first()
    sup = session.query(Supplier).filter(Supplier.supplier_id == po.supplier_id).first() if po else None
    wh = session.query(Warehouse).filter(Warehouse.warehouse_id == gr.warehouse_id).first()

    items = (
        session.query(GRItem, Product)
        .join(Product, Product.product_id == GRItem.product_id)
        .filter(GRItem.gr_id == gr.gr_id)
        .all()
    )
    item_list = []
    for it, p in items:
        item_list.append({
            "sku": p.sku,
            "product_name": p.product_name,
            "quantity_received": it.quantity_received,
            "rejected_quantity": it.rejected_quantity,
            "batch_number": it.batch_number,
            "serial_number": it.serial_number
        })

    return ok({
        "gr_code": gr.gr_code,
        "status": gr.status,
        "receipt_date": gr.receipt_date.isoformat() if gr.receipt_date else None,
        "po_code": po.po_code if po else None,
        "supplier_code": sup.supplier_code if sup else None,
        "supplier_name": sup.supplier_name if sup else None,
        "warehouse_code": wh.warehouse_code if wh else None,
        "warehouse_name": wh.warehouse_name if wh else None,
        "items": item_list
    }, "Chi tiết GR.")

def danh_sach_gr_theo_po(session: Session, po_code: str):
    code = po_code.strip().upper()
    po = session.query(PurchaseOrder).filter(func.upper(PurchaseOrder.po_code) == code).first()
    if not po:
        return can_lam_ro("Không tìm thấy PO. Bạn kiểm tra mã PO.", [])
    grs = session.query(GoodsReceipt).filter(GoodsReceipt.po_id == po.po_id).order_by(GoodsReceipt.receipt_date.desc()).all()
    return ok([{
        "gr_code": g.gr_code,
        "status": g.status,
        "receipt_date": g.receipt_date.isoformat() if g.receipt_date else None,
        "warehouse_id": g.warehouse_id
    } for g in grs], "Danh sách GR theo PO.")

def danh_sach_gr_theo_ncc(session: Session, supplier_code: Optional[str], supplier_name: Optional[str], limit: int):
    q = session.query(Supplier)
    if supplier_code:
        s = q.filter(func.upper(Supplier.supplier_code) == supplier_code.strip().upper()).first()
    elif supplier_name:
        s = q.filter(Supplier.supplier_name.ilike(f"%{supplier_name.strip()}%")).first()
    else:
        return can_lam_ro("Bạn cần cung cấp supplier_code hoặc supplier_name.", [])

    if not s:
        return can_lam_ro("Không tìm thấy nhà cung cấp.", [])

    po_ids = [x.po_id for x in session.query(PurchaseOrder.po_id).filter(PurchaseOrder.supplier_id == s.supplier_id).all()]
    if not po_ids:
        return ok([], "Nhà cung cấp chưa có PO.")

    grs = (
        session.query(GoodsReceipt)
        .filter(GoodsReceipt.po_id.in_(po_ids))
        .order_by(GoodsReceipt.receipt_date.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "gr_code": g.gr_code,
        "status": g.status,
        "receipt_date": g.receipt_date.isoformat() if g.receipt_date else None,
        "po_id": g.po_id
    } for g in grs], "Danh sách GR theo nhà cung cấp.")

def gr_gan_day(session: Session, limit: int):
    grs = session.query(GoodsReceipt).order_by(GoodsReceipt.receipt_date.desc()).limit(limit).all()
    return ok([{
        "gr_code": g.gr_code,
        "status": g.status,
        "receipt_date": g.receipt_date.isoformat() if g.receipt_date else None,
        "po_id": g.po_id,
        "warehouse_id": g.warehouse_id
    } for g in grs], "GR gần đây.")

NHAP_KHO_TOOLS = [
    ToolSpec("tra_cuu_trang_thai_gr", "Tra cứu trạng thái phiếu nhập (GR).", TraCuuTrangThaiGRArgs, tra_cuu_trang_thai_gr, "supply_chain"),
    ToolSpec("chi_tiet_gr", "Tra cứu chi tiết phiếu nhập (GR) và danh sách dòng hàng.", ChiTietGRArgs, chi_tiet_gr, "supply_chain"),
    ToolSpec("danh_sach_gr_theo_po", "Liệt kê các GR phát sinh từ một PO.", DanhSachGRTheoPOArgs, danh_sach_gr_theo_po, "supply_chain"),
    ToolSpec("danh_sach_gr_theo_ncc", "Liệt kê GR theo nhà cung cấp (theo mã hoặc tên).", DanhSachGRTheoNCCArgs, danh_sach_gr_theo_ncc, "supply_chain"),
    ToolSpec("gr_gan_day", "Danh sách phiếu nhập gần đây.", GRGanDayArgs, gr_gan_day, "supply_chain"),
]
'''.lstrip())

    # -------------------------
    # Xuất kho tools (GI)
    # -------------------------
    write("app/modules/supply_chain/tools/tra_cuu_xuat_kho.py", r'''
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import GoodsIssue, GIItem, Warehouse, Product

class TraCuuTrangThaiGIArgs(BaseModel):
    gi_code: str

class ChiTietGIArgs(BaseModel):
    gi_code: str

class DanhSachGITheoLoaiArgs(BaseModel):
    issue_type: str  # SALES_ORDER | INTERNAL_USE | TRANSFER | RETURN_TO_VENDOR
    limit: int = 10

class DanhSachGITheoThamChieuArgs(BaseModel):
    reference_doc_id: str
    limit: int = 10

def tra_cuu_trang_thai_gi(session: Session, gi_code: str):
    code = gi_code.strip().upper()
    gi = session.query(GoodsIssue).filter(func.upper(GoodsIssue.gi_code) == code).first()
    if not gi:
        return can_lam_ro("Không tìm thấy phiếu xuất (GI).", [])
    return ok({
        "gi_code": gi.gi_code,
        "status": gi.status,
        "issue_type": gi.issue_type,
        "reference_doc_id": gi.reference_doc_id,
        "issue_date": gi.issue_date.isoformat() if gi.issue_date else None,
        "warehouse_id": gi.warehouse_id
    }, "Trạng thái GI.")

def chi_tiet_gi(session: Session, gi_code: str):
    code = gi_code.strip().upper()
    gi = session.query(GoodsIssue).filter(func.upper(GoodsIssue.gi_code) == code).first()
    if not gi:
        return can_lam_ro("Không tìm thấy phiếu xuất (GI).", [])
    wh = session.query(Warehouse).filter(Warehouse.warehouse_id == gi.warehouse_id).first()
    items = (
        session.query(GIItem, Product)
        .join(Product, Product.product_id == GIItem.product_id)
        .filter(GIItem.gi_id == gi.gi_id)
        .all()
    )
    item_list = []
    for it, p in items:
        item_list.append({
            "sku": p.sku,
            "product_name": p.product_name,
            "quantity_issued": it.quantity_issued,
            "bin_id": it.bin_id
        })
    return ok({
        "gi_code": gi.gi_code,
        "status": gi.status,
        "issue_type": gi.issue_type,
        "reference_doc_id": gi.reference_doc_id,
        "issue_date": gi.issue_date.isoformat() if gi.issue_date else None,
        "warehouse_code": wh.warehouse_code if wh else None,
        "warehouse_name": wh.warehouse_name if wh else None,
        "items": item_list
    }, "Chi tiết GI.")

def danh_sach_gi_theo_loai(session: Session, issue_type: str, limit: int):
    gi_list = (
        session.query(GoodsIssue)
        .filter(GoodsIssue.issue_type == issue_type)
        .order_by(GoodsIssue.issue_date.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "gi_code": g.gi_code,
        "status": g.status,
        "issue_type": g.issue_type,
        "reference_doc_id": g.reference_doc_id,
        "issue_date": g.issue_date.isoformat() if g.issue_date else None
    } for g in gi_list], "Danh sách GI theo loại.")

def danh_sach_gi_theo_tham_chieu(session: Session, reference_doc_id: str, limit: int):
    ref = reference_doc_id.strip()
    gi_list = (
        session.query(GoodsIssue)
        .filter(GoodsIssue.reference_doc_id == ref)
        .order_by(GoodsIssue.issue_date.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "gi_code": g.gi_code,
        "status": g.status,
        "issue_type": g.issue_type,
        "reference_doc_id": g.reference_doc_id,
        "issue_date": g.issue_date.isoformat() if g.issue_date else None
    } for g in gi_list], "Danh sách GI theo tham chiếu.")

XUAT_KHO_TOOLS = [
    ToolSpec("tra_cuu_trang_thai_gi", "Tra cứu trạng thái phiếu xuất (GI).", TraCuuTrangThaiGIArgs, tra_cuu_trang_thai_gi, "supply_chain"),
    ToolSpec("chi_tiet_gi", "Tra cứu chi tiết phiếu xuất (GI).", ChiTietGIArgs, chi_tiet_gi, "supply_chain"),
    ToolSpec("danh_sach_gi_theo_loai", "Liệt kê phiếu xuất theo loại (bán/nội bộ/chuyển kho...).", DanhSachGITheoLoaiArgs, danh_sach_gi_theo_loai, "supply_chain"),
    ToolSpec("danh_sach_gi_theo_tham_chieu", "Liệt kê phiếu xuất theo chứng từ tham chiếu.", DanhSachGITheoThamChieuArgs, danh_sach_gi_theo_tham_chieu, "supply_chain"),
]
'''.lstrip())

    # -------------------------
    # Mua hàng tools (PR/RFQ/PO)
    # -------------------------
    write("app/modules/supply_chain/tools/tra_cuu_mua_hang.py", r'''
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import PurchaseRequest, PRItem, Quotation, PurchaseOrder, POItem, Supplier, Product

class TraCuuTrangThaiPRArgs(BaseModel):
    pr_code: str

class ChiTietPRArgs(BaseModel):
    pr_code: str

class PRChuaXuLyArgs(BaseModel):
    limit: int = 10

class DanhSachBaoGiaTheoPRArgs(BaseModel):
    pr_code: str

class TraCuuTrangThaiPOArgs(BaseModel):
    po_code: str

class ChiTietPOArgs(BaseModel):
    po_code: str

class POChuaHoanTatArgs(BaseModel):
    limit: int = 10

class TienDoNhapPOArgs(BaseModel):
    po_code: str

def tra_cuu_trang_thai_pr(session: Session, pr_code: str):
    code = pr_code.strip().upper()
    pr = session.query(PurchaseRequest).filter(func.upper(PurchaseRequest.pr_code) == code).first()
    if not pr:
        return can_lam_ro("Không tìm thấy PR.", [])
    return ok({
        "pr_code": pr.pr_code,
        "status": pr.status,
        "request_date": pr.request_date.isoformat() if pr.request_date else None,
        "requester_id": pr.requester_id,
        "department_id": pr.department_id
    }, "Trạng thái PR.")

def chi_tiet_pr(session: Session, pr_code: str):
    code = pr_code.strip().upper()
    pr = session.query(PurchaseRequest).filter(func.upper(PurchaseRequest.pr_code) == code).first()
    if not pr:
        return can_lam_ro("Không tìm thấy PR.", [])
    items = (
        session.query(PRItem, Product)
        .join(Product, Product.product_id == PRItem.product_id)
        .filter(PRItem.pr_id == pr.pr_id)
        .all()
    )
    item_list = []
    for it, p in items:
        item_list.append({
            "sku": p.sku,
            "product_name": p.product_name,
            "quantity_requested": it.quantity_requested,
            "expected_date": it.expected_date.isoformat() if it.expected_date else None
        })
    return ok({
        "pr_code": pr.pr_code,
        "status": pr.status,
        "request_date": pr.request_date.isoformat() if pr.request_date else None,
        "reason": pr.reason,
        "items": item_list
    }, "Chi tiết PR.")

def pr_chua_xu_ly(session: Session, limit: int):
    pr_list = (
        session.query(PurchaseRequest)
        .filter(PurchaseRequest.status.in_(["SUBMITTED", "APPROVED"]))
        .order_by(PurchaseRequest.request_date.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "pr_code": p.pr_code,
        "status": p.status,
        "request_date": p.request_date.isoformat() if p.request_date else None
    } for p in pr_list], "PR đang mở (chưa xử lý xong).")

def danh_sach_bao_gia_theo_pr(session: Session, pr_code: str):
    code = pr_code.strip().upper()
    pr = session.query(PurchaseRequest).filter(func.upper(PurchaseRequest.pr_code) == code).first()
    if not pr:
        return can_lam_ro("Không tìm thấy PR.", [])
    qs = session.query(Quotation).filter(Quotation.pr_id == pr.pr_id).all()
    data = []
    for q in qs:
        sup = session.query(Supplier).filter(Supplier.supplier_id == q.supplier_id).first()
        data.append({
            "rfq_code": q.rfq_code,
            "supplier_code": sup.supplier_code if sup else None,
            "supplier_name": sup.supplier_name if sup else None,
            "total_amount": str(q.total_amount) if q.total_amount is not None else None,
            "status": q.status,
            "is_selected": q.is_selected
        })
    return ok(data, "Danh sách báo giá theo PR.")

def tra_cuu_trang_thai_don_mua(session: Session, po_code: str):
    code = po_code.strip().upper()
    po = session.query(PurchaseOrder).filter(func.upper(PurchaseOrder.po_code) == code).first()
    if not po:
        return can_lam_ro("Không tìm thấy PO.", [])
    sup = session.query(Supplier).filter(Supplier.supplier_id == po.supplier_id).first()
    return ok({
        "po_code": po.po_code,
        "status": po.status,
        "order_date": po.order_date.isoformat() if po.order_date else None,
        "expected_delivery_date": po.expected_delivery_date.isoformat() if po.expected_delivery_date else None,
        "supplier_code": sup.supplier_code if sup else None,
        "supplier_name": sup.supplier_name if sup else None,
        "total_amount": str(po.total_amount),
        "tax_amount": str(po.tax_amount),
        "discount_amount": str(po.discount_amount)
    }, "Trạng thái PO.")

def chi_tiet_po(session: Session, po_code: str):
    code = po_code.strip().upper()
    po = session.query(PurchaseOrder).filter(func.upper(PurchaseOrder.po_code) == code).first()
    if not po:
        return can_lam_ro("Không tìm thấy PO.", [])
    sup = session.query(Supplier).filter(Supplier.supplier_id == po.supplier_id).first()

    items = (
        session.query(POItem, Product)
        .join(Product, Product.product_id == POItem.product_id)
        .filter(POItem.po_id == po.po_id)
        .all()
    )
    item_list = []
    for it, p in items:
        item_list.append({
            "sku": p.sku,
            "product_name": p.product_name,
            "quantity_ordered": it.quantity_ordered,
            "quantity_received": it.quantity_received,
            "unit_price": str(it.unit_price)
        })

    return ok({
        "po_code": po.po_code,
        "status": po.status,
        "supplier_code": sup.supplier_code if sup else None,
        "supplier_name": sup.supplier_name if sup else None,
        "items": item_list
    }, "Chi tiết PO.")

def po_chua_hoan_tat(session: Session, limit: int):
    po_list = (
        session.query(PurchaseOrder)
        .filter(PurchaseOrder.status.in_(["APPROVED", "PARTIAL_RECEIVED"]))
        .order_by(PurchaseOrder.order_date.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "po_code": p.po_code,
        "status": p.status,
        "order_date": p.order_date.isoformat() if p.order_date else None,
        "expected_delivery_date": p.expected_delivery_date.isoformat() if p.expected_delivery_date else None
    } for p in po_list], "PO chưa hoàn tất.")

def tien_do_nhap_po(session: Session, po_code: str):
    code = po_code.strip().upper()
    po = session.query(PurchaseOrder).filter(func.upper(PurchaseOrder.po_code) == code).first()
    if not po:
        return can_lam_ro("Không tìm thấy PO.", [])
    items = session.query(POItem).filter(POItem.po_id == po.po_id).all()
    if not items:
        return ok({"po_code": po.po_code, "progress_percent": 0, "missing_items": []}, "PO không có dòng hàng.")

    ordered = sum(int(i.quantity_ordered or 0) for i in items)
    received = sum(int(i.quantity_received or 0) for i in items)
    progress = 0 if ordered == 0 else round(received * 100.0 / ordered, 2)

    missing = []
    for it in items:
        if int(it.quantity_received or 0) < int(it.quantity_ordered or 0):
            p = session.query(Product).filter(Product.product_id == it.product_id).first()
            missing.append({
                "sku": p.sku if p else None,
                "product_name": p.product_name if p else None,
                "ordered": it.quantity_ordered,
                "received": it.quantity_received,
                "missing": int(it.quantity_ordered) - int(it.quantity_received)
            })

    return ok({
        "po_code": po.po_code,
        "status": po.status,
        "progress_percent": progress,
        "missing_items": missing
    }, "Tiến độ nhập PO.")

MUA_HANG_TOOLS = [
    ToolSpec("tra_cuu_trang_thai_pr", "Tra cứu trạng thái yêu cầu mua (PR).", TraCuuTrangThaiPRArgs, tra_cuu_trang_thai_pr, "supply_chain"),
    ToolSpec("chi_tiet_pr", "Tra cứu chi tiết PR và dòng hàng.", ChiTietPRArgs, chi_tiet_pr, "supply_chain"),
    ToolSpec("pr_chua_xu_ly", "Danh sách PR đang mở.", PRChuaXuLyArgs, pr_chua_xu_ly, "supply_chain"),
    ToolSpec("danh_sach_bao_gia_theo_pr", "Danh sách báo giá (RFQ) theo PR.", DanhSachBaoGiaTheoPRArgs, danh_sach_bao_gia_theo_pr, "supply_chain"),
    ToolSpec("tra_cuu_trang_thai_don_mua", "Tra cứu trạng thái đơn mua (PO).", TraCuuTrangThaiPOArgs, tra_cuu_trang_thai_don_mua, "supply_chain"),
    ToolSpec("chi_tiet_po", "Tra cứu chi tiết PO và dòng hàng.", ChiTietPOArgs, chi_tiet_po, "supply_chain"),
    ToolSpec("po_chua_hoan_tat", "Danh sách PO chưa hoàn tất.", POChuaHoanTatArgs, po_chua_hoan_tat, "supply_chain"),
    ToolSpec("tien_do_nhap_po", "Tính % tiến độ nhập của PO và các mặt hàng còn thiếu.", TienDoNhapPOArgs, tien_do_nhap_po, "supply_chain"),
]
'''.lstrip())

    # -------------------------
    # Nhà cung cấp tools
    # -------------------------
    write("app/modules/supply_chain/tools/tra_cuu_nha_cung_cap.py", r'''
from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import Supplier, PurchaseOrder, GoodsReceipt

class TimNCCArgs(BaseModel):
    tu_khoa: str

class HoSoNCCArgs(BaseModel):
    supplier_code: str

class LichSuMuaNCCArgs(BaseModel):
    supplier_code: str
    limit: int = 10

class DoTreGiaoHangNCCArgs(BaseModel):
    supplier_code: str
    limit: int = 20

def tim_nha_cung_cap(session: Session, tu_khoa: str):
    kw = tu_khoa.strip()
    q = session.query(Supplier).filter((func.upper(Supplier.supplier_code) == kw.upper()) | (Supplier.supplier_name.ilike(f"%{kw}%"))).limit(10)
    data = [{"supplier_id": s.supplier_id, "supplier_code": s.supplier_code, "supplier_name": s.supplier_name} for s in q.all()]
    if not data:
        return can_lam_ro("Không tìm thấy nhà cung cấp.", [])
    return ok(data, "Danh sách NCC khớp từ khóa.")

def ho_so_nha_cung_cap(session: Session, supplier_code: str):
    code = supplier_code.strip().upper()
    s = session.query(Supplier).filter(func.upper(Supplier.supplier_code) == code).first()
    if not s:
        return can_lam_ro("Không tìm thấy NCC theo mã.", [])
    return ok({
        "supplier_code": s.supplier_code,
        "supplier_name": s.supplier_name,
        "tax_code": s.tax_code,
        "contact_email": s.contact_email,
        "contact_phone": s.contact_phone,
        "address": s.address,
        "rating": str(s.rating) if s.rating is not None else None,
        "finance_partner_id": s.finance_partner_id
    }, "Hồ sơ nhà cung cấp.")

def lich_su_mua_ncc(session: Session, supplier_code: str, limit: int):
    code = supplier_code.strip().upper()
    s = session.query(Supplier).filter(func.upper(Supplier.supplier_code) == code).first()
    if not s:
        return can_lam_ro("Không tìm thấy NCC.", [])
    pos = (
        session.query(PurchaseOrder)
        .filter(PurchaseOrder.supplier_id == s.supplier_id)
        .order_by(PurchaseOrder.order_date.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "po_code": p.po_code,
        "status": p.status,
        "order_date": p.order_date.isoformat() if p.order_date else None,
        "expected_delivery_date": p.expected_delivery_date.isoformat() if p.expected_delivery_date else None,
        "total_amount": str(p.total_amount)
    } for p in pos], "Lịch sử PO theo NCC.")

def do_tre_giao_hang_ncc(session: Session, supplier_code: str, limit: int):
    code = supplier_code.strip().upper()
    s = session.query(Supplier).filter(func.upper(Supplier.supplier_code) == code).first()
    if not s:
        return can_lam_ro("Không tìm thấy NCC.", [])
    pos = session.query(PurchaseOrder).filter(PurchaseOrder.supplier_id == s.supplier_id).all()
    if not pos:
        return ok([], "NCC chưa có PO.")

    # map po_id -> expected_delivery_date
    exp_map = {p.po_id: p.expected_delivery_date for p in pos}
    grs = (
        session.query(GoodsReceipt)
        .filter(GoodsReceipt.po_id.in_(list(exp_map.keys())))
        .order_by(GoodsReceipt.receipt_date.desc())
        .limit(limit)
        .all()
    )

    data = []
    for g in grs:
        exp = exp_map.get(g.po_id)
        if exp and g.receipt_date:
            delay = (g.receipt_date.date() - exp).days
        else:
            delay = None
        data.append({
            "gr_code": g.gr_code,
            "po_id": g.po_id,
            "receipt_date": g.receipt_date.isoformat() if g.receipt_date else None,
            "expected_delivery_date": exp.isoformat() if exp else None,
            "delay_days": delay
        })
    return ok(data, "Độ trễ giao hàng (so expected_delivery_date) của NCC.")

NHA_CUNG_CAP_TOOLS = [
    ToolSpec("tim_nha_cung_cap", "Tìm nhà cung cấp theo mã hoặc tên.", TimNCCArgs, tim_nha_cung_cap, "supply_chain"),
    ToolSpec("ho_so_nha_cung_cap", "Xem hồ sơ nhà cung cấp theo mã.", HoSoNCCArgs, ho_so_nha_cung_cap, "supply_chain"),
    ToolSpec("lich_su_mua_ncc", "Lịch sử mua (PO) theo nhà cung cấp.", LichSuMuaNCCArgs, lich_su_mua_ncc, "supply_chain"),
    ToolSpec("do_tre_giao_hang_ncc", "Thống kê độ trễ giao hàng của NCC dựa trên GR vs expected_delivery_date.", DoTreGiaoHangNCCArgs, do_tre_giao_hang_ncc, "supply_chain"),
]
'''.lstrip())

    # -------------------------
    # Truy vết biến động tools
    # -------------------------
    write("app/modules/supply_chain/tools/truy_vet_bien_dong.py", r'''
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import InventoryTransactionLog, Product, Warehouse, BinLocation

class LogBienDongArgs(BaseModel):
    sku: Optional[str] = None
    ma_kho: Optional[str] = None
    loai_giao_dich: Optional[str] = None  # INBOUND/OUTBOUND/ADJUSTMENT/TRANSFER
    limit: int = 20

class TruyVetTheoThamChieuArgs(BaseModel):
    reference_code: str
    limit: int = 50

def log_bien_dong_ton_kho(session: Session, sku: Optional[str], ma_kho: Optional[str], loai_giao_dich: Optional[str], limit: int):
    q = (
        session.query(InventoryTransactionLog, Product, Warehouse, BinLocation)
        .join(Product, Product.product_id == InventoryTransactionLog.product_id)
        .join(Warehouse, Warehouse.warehouse_id == InventoryTransactionLog.warehouse_id)
        .outerjoin(BinLocation, BinLocation.bin_id == InventoryTransactionLog.bin_id)
    )
    if sku:
        q = q.filter(func.upper(Product.sku) == sku.strip().upper())
    if ma_kho:
        q = q.filter(func.upper(Warehouse.warehouse_code) == ma_kho.strip().upper())
    if loai_giao_dich:
        q = q.filter(InventoryTransactionLog.transaction_type == loai_giao_dich)

    rows = q.order_by(InventoryTransactionLog.transaction_date.desc()).limit(limit).all()

    data = []
    for l, p, w, b in rows:
        data.append({
            "transaction_type": l.transaction_type,
            "sku": p.sku,
            "product_name": p.product_name,
            "warehouse_code": w.warehouse_code,
            "bin_code": b.bin_code if b else None,
            "quantity_change": l.quantity_change,
            "reference_code": l.reference_code,
            "transaction_date": l.transaction_date.isoformat() if l.transaction_date else None,
        })
    return ok(data, "Log biến động tồn kho.")

def truy_vet_theo_tham_chieu(session: Session, reference_code: str, limit: int):
    ref = reference_code.strip()
    rows = (
        session.query(InventoryTransactionLog, Product, Warehouse, BinLocation)
        .join(Product, Product.product_id == InventoryTransactionLog.product_id)
        .join(Warehouse, Warehouse.warehouse_id == InventoryTransactionLog.warehouse_id)
        .outerjoin(BinLocation, BinLocation.bin_id == InventoryTransactionLog.bin_id)
        .filter(InventoryTransactionLog.reference_code == ref)
        .order_by(InventoryTransactionLog.transaction_date.desc())
        .limit(limit)
        .all()
    )
    if not rows:
        return can_lam_ro("Không tìm thấy log theo reference_code.", [])
    data = []
    for l, p, w, b in rows:
        data.append({
            "transaction_type": l.transaction_type,
            "sku": p.sku,
            "warehouse_code": w.warehouse_code,
            "bin_code": b.bin_code if b else None,
            "quantity_change": l.quantity_change,
            "transaction_date": l.transaction_date.isoformat() if l.transaction_date else None,
        })
    return ok(data, "Truy vết theo reference_code (GR/GI...).")

TRUY_VET_TOOLS = [
    ToolSpec("log_bien_dong_ton_kho", "Xem log biến động tồn kho (có lọc SKU/kho/loại giao dịch).", LogBienDongArgs, log_bien_dong_ton_kho, "supply_chain"),
    ToolSpec("truy_vet_theo_tham_chieu", "Truy vết biến động theo mã tham chiếu (reference_code).", TruyVetTheoThamChieuArgs, truy_vet_theo_tham_chieu, "supply_chain"),
]
'''.lstrip())

    # -------------------------
    # Kiểm kê tools
    # -------------------------
    write("app/modules/supply_chain/tools/tra_cuu_kiem_ke.py", r'''
from __future__ import annotations
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import Stocktake, StocktakeDetail, Warehouse, Product

class TrangThaiKiemKeArgs(BaseModel):
    stocktake_code: str

class ChiTietKiemKeArgs(BaseModel):
    stocktake_code: str

class BaoCaoChenhLechArgs(BaseModel):
    stocktake_code: str

def tra_cuu_trang_thai_kiem_ke(session: Session, stocktake_code: str):
    code = stocktake_code.strip().upper()
    st = session.query(Stocktake).filter(func.upper(Stocktake.stocktake_code) == code).first()
    if not st:
        return can_lam_ro("Không tìm thấy mã kiểm kê.", [])
    wh = session.query(Warehouse).filter(Warehouse.warehouse_id == st.warehouse_id).first()
    return ok({
        "stocktake_code": st.stocktake_code,
        "status": st.status,
        "warehouse_code": wh.warehouse_code if wh else None,
        "start_date": st.start_date.isoformat() if st.start_date else None,
        "end_date": st.end_date.isoformat() if st.end_date else None,
    }, "Trạng thái kiểm kê.")

def chi_tiet_kiem_ke(session: Session, stocktake_code: str):
    code = stocktake_code.strip().upper()
    st = session.query(Stocktake).filter(func.upper(Stocktake.stocktake_code) == code).first()
    if not st:
        return can_lam_ro("Không tìm thấy mã kiểm kê.", [])
    rows = (
        session.query(StocktakeDetail, Product)
        .join(Product, Product.product_id == StocktakeDetail.product_id)
        .filter(StocktakeDetail.stocktake_id == st.stocktake_id)
        .all()
    )
    details = []
    for d, p in rows:
        details.append({
            "sku": p.sku,
            "product_name": p.product_name,
            "system_quantity": d.system_quantity,
            "actual_quantity": d.actual_quantity,
            "variance": d.actual_quantity - d.system_quantity
        })
    return ok({
        "stocktake_code": st.stocktake_code,
        "status": st.status,
        "details": details
    }, "Chi tiết kiểm kê.")

def bao_cao_chenh_lech(session: Session, stocktake_code: str):
    code = stocktake_code.strip().upper()
    st = session.query(Stocktake).filter(func.upper(Stocktake.stocktake_code) == code).first()
    if not st:
        return can_lam_ro("Không tìm thấy mã kiểm kê.", [])
    rows = (
        session.query(StocktakeDetail, Product)
        .join(Product, Product.product_id == StocktakeDetail.product_id)
        .filter(StocktakeDetail.stocktake_id == st.stocktake_id)
        .all()
    )
    variance_list = []
    for d, p in rows:
        var = d.actual_quantity - d.system_quantity
        if var != 0:
            variance_list.append({
                "sku": p.sku,
                "product_name": p.product_name,
                "system_quantity": d.system_quantity,
                "actual_quantity": d.actual_quantity,
                "variance": var
            })
    return ok({
        "stocktake_code": st.stocktake_code,
        "variance_items": variance_list,
        "variance_count": len(variance_list)
    }, "Báo cáo chênh lệch kiểm kê.")

KIEM_KE_TOOLS = [
    ToolSpec("tra_cuu_trang_thai_kiem_ke", "Tra cứu trạng thái chứng từ kiểm kê.", TrangThaiKiemKeArgs, tra_cuu_trang_thai_kiem_ke, "supply_chain"),
    ToolSpec("chi_tiet_kiem_ke", "Chi tiết kiểm kê theo sản phẩm.", ChiTietKiemKeArgs, chi_tiet_kiem_ke, "supply_chain"),
    ToolSpec("bao_cao_chenh_lech_kiem_ke", "Báo cáo chênh lệch (variance) của kiểm kê.", BaoCaoChenhLechArgs, bao_cao_chenh_lech, "supply_chain"),
]
'''.lstrip())

    # -------------------------
    # RBAC update (supply_chain roles)
    # -------------------------
    write("app/core/rbac.py", r'''
MODULE_ALLOWED_ROLES = {
    "hrm": {"HR_ADMIN", "HR_STAFF", "MANAGER"},
    "sale_crm": {"SALES", "CSKH", "MANAGER"},
    "finance_accounting": {"ACCOUNTANT", "FINANCE_MANAGER"},
    "supply_chain": {"WAREHOUSE", "PROCUREMENT", "MANAGER"},
}

def check_role(module: str, role: str | None) -> bool:
    if role is None:
        return False
    return role in MODULE_ALLOWED_ROLES.get(module, set())
'''.lstrip())

    print("\nDONE. FN-2 Supply Chain (Router+Executor+Tools) đã được sinh code.")
    print("Tiếp theo: chạy uvicorn và test endpoint /api/v1/chat với module=supply_chain")

if __name__ == "__main__":
    main()