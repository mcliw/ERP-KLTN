from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def write(rel_path: str, content: str):
    p = ROOT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"[WRITE] {rel_path}")

def main():
    # =========================
    # 1) app/ai/router.py (Gemini Router)
    # =========================
    write("app/ai/router.py", r'''
from __future__ import annotations

import json
import os
from typing import Dict, Any

from dotenv import load_dotenv
from google import genai

from app.ai.plan_schema import Plan
from app.ai.module_registry import list_tools

load_dotenv()

# Ưu tiên GEMINI_API_KEY (Gemini Developer API). Quickstart cũng dùng env var này. :contentReference[oaicite:2]{index=2}
_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

PLAN_JSON_SCHEMA: Dict[str, Any] = {
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

def _tool_catalog(module: str) -> str:
    tools = list_tools(module)
    if not tools:
        return "(module chưa có tools)"
    lines = []
    for t in tools:
        # Tóm tắt tham số theo pydantic model_fields
        fields = []
        for name, f in t.args_model.model_fields.items():
            required = f.is_required()
            # annotation có thể dài; hiển thị ngắn
            ann = getattr(f.annotation, "__name__", str(f.annotation))
            fields.append(f"{name}{'' if required else '?'}:{ann}")
        lines.append(f"- {t.ten_tool}: {t.mo_ta} | args: {', '.join(fields)}")
    return "\n".join(lines)

def _build_system_instruction(module: str, auth: dict) -> str:
    return f"""
Bạn là Router cho chatbot ERP. Bạn KHÔNG trả lời người dùng trực tiếp.
Nhiệm vụ duy nhất: tạo PLAN JSON theo schema đã cung cấp (response_json_schema).

Bối cảnh:
- Module hiện tại: {module}
- Role: {auth.get("role")}

Quy tắc bắt buộc:
1) Chỉ lập kế hoạch bằng cách gọi tool thuộc đúng module hiện tại.
2) Không bịa tool, không bịa tham số. Thiếu thông tin thì needs_clarification=true và đặt clarifying_question rõ ràng.
3) Nếu câu hỏi ngoài phạm vi module hiện tại: needs_clarification=true và hướng dẫn người dùng chuyển đúng module.
4) Nếu cần nhiều bước (phụ thuộc kết quả bước trước): tạo nhiều steps theo thứ tự, id lần lượt: s1, s2, s3...
5) Để truyền kết quả bước trước vào args bước sau, dùng placeholder:
   - Ví dụ: "{{s1.data.sku}}" hoặc "{{s1.data.items[0].sku}}"
6) steps phải tối giản, đúng nghiệp vụ, ưu tiên tra cứu read-only.
7) final_response_template: tạo câu trả lời tiếng Việt ngắn gọn, sử dụng placeholder từ các bước.

Danh sách tools khả dụng trong module {module}:
{_tool_catalog(module)}
""".strip()

def plan_route(module: str, message: str, auth: dict) -> Plan:
    msg = (message or "").strip()

    # Hiện bạn mới triển khai FN-2 supply_chain trước → chặn module khác để không “lạc”.
    if module != "supply_chain":
        return Plan(
            module=module,
            intent="ngoai_pham_vi",
            needs_clarification=True,
            clarifying_question=(
                f"Bạn đang ở module '{module}'. Hiện mình mới triển khai FN-2 cho module 'supply_chain'. "
                f"Bạn chuyển sang Supply Chain để tra cứu tồn kho/PO/GR/GI/nhà cung cấp."
            ),
            steps=[],
            final_response_template=None,
        )

    sys = _build_system_instruction(module, auth)

    config = {
        "system_instruction": sys,
        "temperature": 0,
        "response_mime_type": "application/json",
        "response_json_schema": PLAN_JSON_SCHEMA,
    }

    # Structured outputs: bắt model trả JSON theo schema. :contentReference[oaicite:3]{index=3}
    resp = _client.models.generate_content(
        model=_GEMINI_MODEL,
        contents=f"USER_MESSAGE:\n{msg}",
        config=config,
    )

    text = (resp.text or "").strip()
    if not text:
        return Plan(
            module=module,
            intent="router_error",
            needs_clarification=True,
            clarifying_question="Router không nhận được output từ Gemini. Bạn thử lại câu hỏi ngắn hơn.",
            steps=[],
            final_response_template=None,
        )

    # Parse và validate bằng Pydantic Plan
    try:
        data = json.loads(text)
        return Plan.model_validate(data)
    except Exception:
        # fallback: cố gắng Plan.model_validate_json
        try:
            return Plan.model_validate_json(text)
        except Exception:
            return Plan(
                module=module,
                intent="router_parse_error",
                needs_clarification=True,
                clarifying_question=(
                    "Router không parse được PLAN JSON từ Gemini. "
                    "Bạn thử hỏi lại theo dạng: 'Tra tồn kho SKU ...' hoặc 'Trạng thái PO-...'."
                ),
                steps=[],
                final_response_template=None,
            )
'''.lstrip())

    # =========================
    # 2) (Khuyến nghị) chỉnh 3 tool “tìm” để tự hỏi lại khi có nhiều kết quả
    #    => Router không tự chọn bừa, demo sẽ “chắc” hơn khi nộp báo cáo.
    # =========================

    # tra_cuu_ton_kho.py: tim_san_pham + tim_kho
    write("app/modules/supply_chain/tools/tra_cuu_ton_kho.py", r'''
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import CurrentStock, Product, Warehouse, BinLocation
from app.modules.supply_chain.tools._helpers import tim_san_pham_theo_sku_or_ten, tim_kho_theo_ma_or_ten

class TimSanPhamArgs(BaseModel):
    tu_khoa: str = Field(..., description="SKU hoặc tên sản phẩm")

class TimKhoArgs(BaseModel):
    tu_khoa: str = Field(..., description="Mã kho hoặc tên kho")

class TraCuuTonKhoTheoSkuArgs(BaseModel):
    sku: str
    ma_kho: Optional[str] = None

class TraCuuTonKhoTheoTenArgs(BaseModel):
    ten_san_pham: str
    ma_kho: Optional[str] = None

class TongHopTonKhoArgs(BaseModel):
    ma_kho: Optional[str] = None

class CanhBaoTonKhoArgs(BaseModel):
    ma_kho: Optional[str] = None
    nguong_sap_het: int = 5
    he_so_ton_qua_nhieu: int = 10

def tim_san_pham(session: Session, tu_khoa: str):
    matches = tim_san_pham_theo_sku_or_ten(session, tu_khoa, limit=10)
    if not matches:
        return can_lam_ro("Không tìm thấy sản phẩm. Bạn kiểm tra lại SKU hoặc tên sản phẩm.", [])
    if len(matches) > 1:
        return can_lam_ro("Có nhiều sản phẩm khớp. Bạn chọn đúng sản phẩm.", matches)
    return ok(matches[0], "Đã xác định sản phẩm.")

def tim_kho(session: Session, tu_khoa: str):
    matches = tim_kho_theo_ma_or_ten(session, tu_khoa, limit=10)
    if not matches:
        return can_lam_ro("Không tìm thấy kho. Bạn kiểm tra lại mã kho hoặc tên kho.", [])
    if len(matches) > 1:
        return can_lam_ro("Có nhiều kho khớp. Bạn chọn đúng kho.", matches)
    return ok(matches[0], "Đã xác định kho.")

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

    return ok({"sap_het": sap_het, "ton_qua_nhieu": ton_qua_nhieu}, "Cảnh báo tồn kho (sắp hết / tồn quá nhiều).")

TON_KHO_TOOLS = [
    ToolSpec("tim_san_pham", "Tìm sản phẩm theo SKU hoặc tên (mơ hồ sẽ yêu cầu chọn).", TimSanPhamArgs, tim_san_pham, "supply_chain"),
    ToolSpec("tim_kho", "Tìm kho theo mã hoặc tên (mơ hồ sẽ yêu cầu chọn).", TimKhoArgs, tim_kho, "supply_chain"),
    ToolSpec("tra_cuu_ton_kho_theo_sku", "Tra cứu tồn kho theo SKU (có thể lọc theo kho).", TraCuuTonKhoTheoSkuArgs, tra_cuu_ton_kho_theo_sku, "supply_chain"),
    ToolSpec("tra_cuu_ton_kho_theo_ten", "Tra cứu tồn kho theo tên sản phẩm (mơ hồ sẽ yêu cầu chọn).", TraCuuTonKhoTheoTenArgs, tra_cuu_ton_kho_theo_ten, "supply_chain"),
    ToolSpec("tong_hop_ton_kho", "Tổng hợp tồn kho toàn hệ thống hoặc theo kho.", TongHopTonKhoArgs, tong_hop_ton_kho, "supply_chain"),
    ToolSpec("canh_bao_ton_kho", "Cảnh báo tồn kho: sắp hết / tồn quá nhiều.", CanhBaoTonKhoArgs, canh_bao_ton_kho, "supply_chain"),
]
'''.lstrip())

    # tra_cuu_nha_cung_cap.py: tim_nha_cung_cap
    write("app/modules/supply_chain/tools/tra_cuu_nha_cung_cap.py", r'''
from __future__ import annotations
from typing import Optional
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
    q = (
        session.query(Supplier)
        .filter((func.upper(Supplier.supplier_code) == kw.upper()) | (Supplier.supplier_name.ilike(f"%{kw}%")))
        .limit(10)
    )
    data = [{"supplier_id": s.supplier_id, "supplier_code": s.supplier_code, "supplier_name": s.supplier_name} for s in q.all()]
    if not data:
        return can_lam_ro("Không tìm thấy nhà cung cấp.", [])
    if len(data) > 1:
        return can_lam_ro("Có nhiều nhà cung cấp khớp. Bạn chọn đúng nhà cung cấp.", data)
    return ok(data[0], "Đã xác định nhà cung cấp.")

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
    return ok(data, "Độ trễ giao hàng (GR vs expected_delivery_date) của NCC.")

NHA_CUNG_CAP_TOOLS = [
    ToolSpec("tim_nha_cung_cap", "Tìm nhà cung cấp theo mã hoặc tên (mơ hồ sẽ yêu cầu chọn).", TimNCCArgs, tim_nha_cung_cap, "supply_chain"),
    ToolSpec("ho_so_nha_cung_cap", "Xem hồ sơ nhà cung cấp theo mã.", HoSoNCCArgs, ho_so_nha_cung_cap, "supply_chain"),
    ToolSpec("lich_su_mua_ncc", "Lịch sử mua (PO) theo nhà cung cấp.", LichSuMuaNCCArgs, lich_su_mua_ncc, "supply_chain"),
    ToolSpec("do_tre_giao_hang_ncc", "Thống kê độ trễ giao hàng của NCC.", DoTreGiaoHangNCCArgs, do_tre_giao_hang_ncc, "supply_chain"),
]
'''.lstrip())

    print("\nDONE: Router đã chuyển sang Gemini Structured Output + (khuyến nghị) tool 'tìm' tự hỏi lại khi mơ hồ.")

if __name__ == "__main__":
    main()
