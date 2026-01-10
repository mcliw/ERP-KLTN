from __future__ import annotations
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.supply_chain.models import Stocktake, StocktakeDetail, Product
from .helpers import norm_code, as_int

class TrangThaiKiemKeArgs(BaseModel):
    stocktake_code: str

class ChiTietKiemKeArgs(BaseModel):
    stocktake_code: str
    limit: int = 200

class BaoCaoChenhLechArgs(BaseModel):
    stocktake_code: str
    limit: int = 200

def tra_cuu_trang_thai_kiem_ke(session: Session, stocktake_code: str):
    code = norm_code(stocktake_code)
    st = session.query(Stocktake).filter(func.upper(Stocktake.stocktake_code) == code).first()
    if not st:
        return can_lam_ro("Không tìm thấy đợt kiểm kê.", [])
    return ok({"stocktake_code": st.stocktake_code, "status": st.status, "warehouse_id": st.warehouse_id}, "Trạng thái kiểm kê.")

def chi_tiet_kiem_ke(session: Session, stocktake_code: str, limit: int = 200):
    code = norm_code(stocktake_code)
    st = session.query(Stocktake).filter(func.upper(Stocktake.stocktake_code) == code).first()
    if not st:
        return can_lam_ro("Không tìm thấy đợt kiểm kê.", [])
    rows = (
        session.query(Product.sku, Product.product_name, StocktakeDetail.system_quantity, StocktakeDetail.actual_quantity)
        .join(StocktakeDetail, StocktakeDetail.product_id == Product.product_id)
        .filter(StocktakeDetail.stocktake_id == st.stocktake_id)
        .order_by(Product.product_name.asc())
        .limit(limit)
        .all()
    )
    items = []
    for r in rows:
        sys_q = as_int(r.system_quantity)
        act_q = as_int(r.actual_quantity)
        items.append({"sku": r.sku, "product_name": r.product_name, "system_quantity": sys_q, "actual_quantity": act_q, "variance": act_q - sys_q})
    return ok({"stocktake_code": st.stocktake_code, "status": st.status, "items": items}, "Chi tiết kiểm kê (kèm chênh lệch).")

def bao_cao_chenh_lech_kiem_ke(session: Session, stocktake_code: str, limit: int = 200):
    code = norm_code(stocktake_code)
    st = session.query(Stocktake).filter(func.upper(Stocktake.stocktake_code) == code).first()
    if not st:
        return can_lam_ro("Không tìm thấy đợt kiểm kê.", [])
    rows = (
        session.query(Product.sku, Product.product_name, (StocktakeDetail.actual_quantity - StocktakeDetail.system_quantity).label("variance"))
        .join(StocktakeDetail, StocktakeDetail.product_id == Product.product_id)
        .filter(StocktakeDetail.stocktake_id == st.stocktake_id)
        .order_by(func.abs((StocktakeDetail.actual_quantity - StocktakeDetail.system_quantity)).desc())
        .limit(limit)
        .all()
    )
    data = [{"sku": r.sku, "product_name": r.product_name, "variance": as_int(r.variance)} for r in rows if as_int(r.variance) != 0]
    return ok({"stocktake_code": st.stocktake_code, "variance_items": data}, "Báo cáo chênh lệch kiểm kê.")

KIEM_KE_TOOLS = [
    ToolSpec("tra_cuu_trang_thai_kiem_ke", "Tra trạng thái đợt kiểm kê.", TrangThaiKiemKeArgs, tra_cuu_trang_thai_kiem_ke, "supply_chain"),
    ToolSpec("chi_tiet_kiem_ke", "Tra chi tiết kiểm kê (kèm variance).", ChiTietKiemKeArgs, chi_tiet_kiem_ke, "supply_chain"),
    ToolSpec("bao_cao_chenh_lech_kiem_ke", "Báo cáo chênh lệch kiểm kê (variance report).", BaoCaoChenhLechArgs, bao_cao_chenh_lech_kiem_ke, "supply_chain"),
]
