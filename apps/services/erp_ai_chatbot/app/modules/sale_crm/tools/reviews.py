from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.ai.tooling import ToolSpec, ok, can_lam_ro
from app.modules.sale_crm.models import Review, ImgReview, User, Product

class TaoReviewArgs(BaseModel):
    product_id: int = Field(..., ge=1)
    user_id: int = Field(..., ge=1)
    content: str = Field(..., min_length=1)
    rating: int = Field(..., ge=1, le=5)

class TaoReviewKemAnhArgs(TaoReviewArgs):
    image_urls: List[str] = Field(default_factory=list, min_length=0)

class GetReviewsArgs(BaseModel):
    product_id: int = Field(..., ge=1)
    limit: int = Field(default=20, ge=1, le=200)

class GetAnhReviewArgs(BaseModel):
    product_id: Optional[int] = Field(default=None, ge=1)
    review_id: Optional[int] = Field(default=None, ge=1)
    limit: int = Field(default=20, ge=1, le=200)

class ThongKeReviewArgs(BaseModel):
    product_id: int = Field(..., ge=1)

def _recalc_product_avg_rating(session: Session, product_id: int) -> None:
    avg = session.query(func.avg(Review.rating)).filter(Review.product_id == product_id).scalar()
    p = session.query(Product).filter(Product.id == product_id).first()
    if p:
        p.avg_rating = avg
        session.add(p)

def tao_danh_gia(session: Session, product_id: int, user_id: int, content: str, rating: int) -> Dict[str, Any]:
    r = Review(product_id=product_id, user_id=user_id, content=content, rating=rating)
    session.add(r)
    session.flush()
    _recalc_product_avg_rating(session, product_id)
    session.commit()
    return ok({"review_id": r.id})

def tao_danh_gia_kem_anh(session: Session, product_id: int, user_id: int, content: str, rating: int, image_urls: List[str]) -> Dict[str, Any]:
    r = Review(product_id=product_id, user_id=user_id, content=content, rating=rating)
    session.add(r)
    session.flush()
    for url in image_urls:
        # Schema: img_review(image)
        session.add(ImgReview(review_id=r.id, image=url))
    _recalc_product_avg_rating(session, product_id)
    session.commit()
    return ok({"review_id": r.id, "images_added": len(image_urls)})

def danh_gia_san_pham(session: Session, product_id: int, limit: int = 20) -> Dict[str, Any]:
    rows = (
        session.query(Review, User)
        .join(User, Review.user_id == User.id)
        .filter(Review.product_id == product_id)
        .order_by(Review.created_at.desc())
        .limit(limit)
        .all()
    )
    return ok([{
        "rating": r.rating,
        "content": r.content,
        "username": u.username,
        "created_at": r.created_at,
        "user_id": r.user_id,
        "review_id": r.id,
    } for r, u in rows])

def anh_danh_gia_san_pham(session: Session, product_id: Optional[int] = None, review_id: Optional[int] = None, limit: int = 20) -> Dict[str, Any]:
    if not product_id and not review_id:
        return can_lam_ro("Bạn cần cung cấp product_id hoặc review_id để lấy ảnh đánh giá.", {})
    q = session.query(ImgReview)
    if review_id:
        q = q.filter(ImgReview.review_id == review_id)
    if product_id:
        q = q.join(Review, ImgReview.review_id == Review.id).filter(Review.product_id == product_id)
    rows = q.order_by(ImgReview.id.desc()).limit(limit).all()
    return ok([{
        "img_review_id": x.id,
        "review_id": x.review_id,
        "image": getattr(x, "image", None),
    } for x in rows])

def thong_ke_danh_gia_san_pham(session: Session, product_id: int) -> Dict[str, Any]:
    avg = session.query(func.avg(Review.rating)).filter(Review.product_id == product_id).scalar()
    total = session.query(func.count(Review.id)).filter(Review.product_id == product_id).scalar()

    dist_rows = (
        session.query(
            Review.rating,
            func.count(Review.id).label("cnt")
        )
        .filter(Review.product_id == product_id)
        .group_by(Review.rating)
        .all()
    )
    dist = {int(rating): int(cnt) for rating, cnt in dist_rows}

    return ok({
        "product_id": product_id,
        "avg_rating": float(avg or 0),
        "total_reviews": int(total or 0),
        "distribution": {str(k): dist.get(k, 0) for k in [1,2,3,4,5]},
    })

REVIEW_TOOLS: List[ToolSpec] = [
    ToolSpec("tao_danh_gia", "Tạo đánh giá sản phẩm.", TaoReviewArgs, tao_danh_gia, "sale_crm", read_only=False),
    ToolSpec("tao_danh_gia_kem_anh", "Tạo đánh giá kèm ảnh review.", TaoReviewKemAnhArgs, tao_danh_gia_kem_anh, "sale_crm", read_only=False),
    ToolSpec("danh_gia_san_pham", "Xem danh sách đánh giá sản phẩm.", GetReviewsArgs, danh_gia_san_pham, "sale_crm"),
    ToolSpec("anh_danh_gia_san_pham", "Lấy ảnh đánh giá theo product hoặc review.", GetAnhReviewArgs, anh_danh_gia_san_pham, "sale_crm"),
    ToolSpec("thong_ke_danh_gia_san_pham", "Thống kê rating (avg, count, phân phối sao).", ThongKeReviewArgs, thong_ke_danh_gia_san_pham, "sale_crm"),
]
