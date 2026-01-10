from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.sale_crm_database import SaleCrmBase

class Role(SaleCrmBase):
    __tablename__ = "role"

    id = Column(Integer, primary_key=True)
    role_name = Column(String(50), nullable=False)
    
class User(SaleCrmBase):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey("role.id"))

    username = Column(String(255))
    email = Column(String(255))
    phone = Column(String(20))
    password = Column(String(255))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role")

class Address(SaleCrmBase):
    __tablename__ = "address"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"))

    city = Column(String(255))
    district = Column(String(255))
    ward = Column(String(255))
    street_address = Column(String(255))
    is_default = Column(Boolean, default=False)

    user = relationship("User")

class Product(SaleCrmBase):
    __tablename__ = "product"

    id = Column(Integer, primary_key=True)
    brand_id = Column(Integer, ForeignKey("brand.id"))

    name = Column(String(255))
    description = Column(String)

    avg_rating = Column(Numeric(3, 2))
    total_sold = Column(Integer, default=0)
    total_stock = Column(Integer, default=0)

    is_active = Column(Boolean, default=True)

    brand = relationship("Brand")


class ProductVariant(SaleCrmBase):
    __tablename__ = "product_variant"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("product.id"))

    name = Column(String(255))
    stock = Column(Integer)
    sold = Column(Integer, default=0)

    original_price = Column(Numeric(12, 2))
    discount_amount = Column(Numeric(12, 2))
    discount_percent = Column(Numeric(5, 2))

    product = relationship("Product")

class Payment(SaleCrmBase):
    __tablename__ = "payment"

    id = Column(Integer, primary_key=True)
    amount = Column(Numeric(12, 2))
    payment_status = Column(String(50))
    payment_method = Column(String(50))
    transaction_id = Column(String(255))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Order(SaleCrmBase):
    __tablename__ = "order"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    payment_id = Column(Integer, ForeignKey("payment.id"))

    order_status = Column(String(50))
    payment_method = Column(String(50))
    shipping_address = Column(String(255))

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    payment = relationship("Payment")

class OrderDetail(SaleCrmBase):
    __tablename__ = "order_detail"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("order.id"))
    product_variant_id = Column(Integer, ForeignKey("product_variant.id"))

    quantity = Column(Integer)
    price = Column(Numeric(12, 2))

class Review(SaleCrmBase):
    __tablename__ = "review"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("product.id"))
    user_id = Column(Integer, ForeignKey("user.id"))

    content = Column(String)
    rating = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class Brand(SaleCrmBase):
    __tablename__ = "brand"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(String)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

class Voucher(SaleCrmBase):
    __tablename__ = "voucher"

    id = Column(Integer, primary_key=True)
    name = Column(String(255))
    description = Column(String)

    discount_type = Column(String(50))  # PERCENT | FIXED
    discount_value = Column(Numeric(12, 2))

    start_date = Column(DateTime)
    end_date = Column(DateTime)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class VoucherDetail(SaleCrmBase):
    __tablename__ = "voucher_detail"

    id = Column(Integer, primary_key=True)
    voucher_id = Column(Integer, ForeignKey("voucher.id"))

    code = Column(String(50), unique=True, nullable=False)
    usage_limit = Column(Integer)
    used_count = Column(Integer, default=0)

    is_active = Column(Boolean, default=True)

    voucher = relationship("Voucher")

class VoucherConstraint(SaleCrmBase):
    __tablename__ = "voucher_constraint"

    id = Column(Integer, primary_key=True)
    voucher_id = Column(Integer, ForeignKey("voucher.id"))

    min_order_amount = Column(Numeric(12, 2))
    max_discount_amount = Column(Numeric(12, 2))

    is_new_customer_only = Column(Boolean, default=False)

    voucher = relationship("Voucher")

class ImgReview(SaleCrmBase):
    __tablename__ = "img_review"

    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey("review.id"))

    image_url = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    review = relationship("Review")

