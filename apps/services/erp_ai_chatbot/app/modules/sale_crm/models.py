from __future__ import annotations
from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, Text, Enum, Numeric, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.sale_crm_database import  SaleCrmBase# Giả sử SaleCrmSaleCrmBase được import từ core của project

# --- 1. ENUM DEFINITIONS ---

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    CUSTOMER = "CUSTOMER"

class DiscountTypeEnum(str, enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED_AMOUNT = "FIXED_AMOUNT"
    SHIPPING = "SHIPPING"

class OrderStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    SHIPPING = "SHIPPING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

# --- 2. AUTH & USER MODULE ---

class Role(SaleCrmBase):
    __tablename__ = "role"
    
    id = Column(Integer, primary_key=True, index=True)
    role_name = Column(Enum(RoleEnum), default=RoleEnum.CUSTOMER, nullable=False)
    
    users = relationship("User", back_populates="role")

class User(SaleCrmBase):
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("role.id"))
    username = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20))
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    role = relationship("Role", back_populates="users")
    addresses = relationship("Address", back_populates="user")
    news_list = relationship("News", back_populates="author")
    cart = relationship("Cart", uselist=False, back_populates="user")
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")

class Address(SaleCrmBase):
    __tablename__ = "address"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    city = Column(String(255))
    district = Column(String(255))
    ward = Column(String(255))
    street_address = Column(String(255))
    is_default = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="addresses")

# --- 3. NEWS / CMS MODULE ---

class News(SaleCrmBase):
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("user.id"))
    title = Column(String(255), nullable=False)
    content = Column(Text)
    thumbnail = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    author = relationship("User", back_populates="news_list")
    blocks = relationship("ContentBlock", back_populates="news", cascade="all, delete-orphan")

class ContentBlock(SaleCrmBase):
    __tablename__ = "content_block"
    
    id = Column(Integer, primary_key=True, index=True)
    news_id = Column(Integer, ForeignKey("news.id"), nullable=False)
    sort_order = Column(Integer, default=0)
    content = Column(Text)
    img_content = Column(String(255))
    caption_img = Column(String(255))
    
    news = relationship("News", back_populates="blocks")

# --- 4. CATALOG MODULE ---

class Unit(SaleCrmBase):
    __tablename__ = "unit"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(25), nullable=False)
    
    attributes = relationship("Attribute", back_populates="unit")

class Brand(SaleCrmBase):
    __tablename__ = "brand"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True)
    logo = Column(String(255))
    
    cate_brand_links = relationship("CateBrandLink", back_populates="brand")

class Category(SaleCrmBase):
    __tablename__ = "category"
    
    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("category.id"), nullable=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True)
    icon_emoji = Column(String(100))
    
    parent = relationship("Category", remote_side=[id], backref="children")
    cate_brand_links = relationship("CateBrandLink", back_populates="category")
    cate_attribute_links = relationship("CateAttributeLink", back_populates="category")

class Attribute(SaleCrmBase):
    __tablename__ = "attribute"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    unit_id = Column(Integer, ForeignKey("unit.id"))
    
    unit = relationship("Unit", back_populates="attributes")
    cate_attribute_links = relationship("CateAttributeLink", back_populates="attribute")
    product_values = relationship("ProductAttributeValue", back_populates="attribute")

class CateBrandLink(SaleCrmBase):
    __tablename__ = "cate_brand_link"
    __table_args__ = (UniqueConstraint('brand_id', 'category_id', name='_brand_category_uc'),)
    
    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brand.id"))
    category_id = Column(Integer, ForeignKey("category.id"))
    
    brand = relationship("Brand", back_populates="cate_brand_links")
    category = relationship("Category", back_populates="cate_brand_links")
    products = relationship("Product", back_populates="cate_brand_link")

class CateAttributeLink(SaleCrmBase):
    __tablename__ = "cate_attribute_link"
    
    id = Column(Integer, primary_key=True, index=True)
    attribute_id = Column(Integer, ForeignKey("attribute.id"))
    category_id = Column(Integer, ForeignKey("category.id"))
    
    attribute = relationship("Attribute", back_populates="cate_attribute_links")
    category = relationship("Category", back_populates="cate_attribute_links")

# --- 5. PRODUCT MODULE ---

class Product(SaleCrmBase):
    __tablename__ = "product"
    
    id = Column(Integer, primary_key=True, index=True)
    cate_brand_link_id = Column(Integer, ForeignKey("cate_brand_link.id"))
    name = Column(String(255), nullable=False)
    avg_rating = Column(Numeric(2, 1), default=0.0)
    total_sold = Column(Integer, default=0)
    total_stock = Column(Integer, default=0)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    cate_brand_link = relationship("CateBrandLink", back_populates="products")
    attribute_values = relationship("ProductAttributeValue", back_populates="product")
    variants = relationship("ProductVariant", back_populates="product")
    images = relationship("ImgProduct", back_populates="product")
    desc_blocks = relationship("ProductDescriptionBlock", back_populates="product")
    reviews = relationship("Review", back_populates="product")

class ProductAttributeValue(SaleCrmBase):
    __tablename__ = "product_attribute_value"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("product.id"))
    attribute_id = Column(Integer, ForeignKey("attribute.id"))
    value = Column(String(255), nullable=False)
    
    product = relationship("Product", back_populates="attribute_values")
    attribute = relationship("Attribute", back_populates="product_values")

class ProductVariant(SaleCrmBase):
    __tablename__ = "product_variant"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=False)
    img_product_id = Column(Integer) # Có thể FK nếu muốn strict
    name = Column(String(255))
    stock = Column(Integer, default=0)
    sold = Column(Integer, default=0)
    original_price = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0)
    discount_percent = Column(Numeric(5, 2), default=0)
    
    product = relationship("Product", back_populates="variants")
    cart_items = relationship("CartItem", back_populates="variant")
    order_details = relationship("OrderDetail", back_populates="variant")

class ImgProduct(SaleCrmBase):
    __tablename__ = "img_product"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("product.id"))
    image = Column(String(255), nullable=False)
    
    product = relationship("Product", back_populates="images")

class ProductDescriptionBlock(SaleCrmBase):
    __tablename__ = "product_description_block"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("product.id"))
    sort_order = Column(Integer)
    content = Column(Text)
    img_content = Column(String(255))
    caption_img = Column(String(255))
    
    product = relationship("Product", back_populates="desc_blocks")

# --- 6. MARKETING MODULE ---

class Voucher(SaleCrmBase):
    __tablename__ = "voucher"
    
    id = Column(Integer, primary_key=True, index=True)
    discount_type = Column(Enum(DiscountTypeEnum), nullable=True)
    discount_value = Column(Numeric(10, 2))
    is_active = Column(Boolean, default=True)
    
    constraints = relationship("VoucherConstraint", back_populates="voucher")
    details = relationship("VoucherDetail", back_populates="voucher")

class VoucherConstraint(SaleCrmBase):
    __tablename__ = "voucher_constraint"
    
    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("voucher.id"), nullable=False)
    min_order_amount = Column(Numeric(10, 2))
    max_discount_amount = Column(Numeric(10, 2))
    
    voucher = relationship("Voucher", back_populates="constraints")

class VoucherDetail(SaleCrmBase):
    __tablename__ = "voucher_detail"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    voucher_id = Column(Integer, ForeignKey("voucher.id"))
    is_active = Column(Boolean, default=True)
    
    voucher = relationship("Voucher", back_populates="details")
    orders = relationship("Order", back_populates="voucher_detail")

# --- 7. SALES MODULE ---

class Cart(SaleCrmBase):
    __tablename__ = "cart"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), unique=True)
    
    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart")

class CartItem(SaleCrmBase):
    __tablename__ = "cart_item"
    
    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("cart.id"), nullable=False)
    product_variant_id = Column(Integer, ForeignKey("product_variant.id"))
    quantity = Column(Integer, default=1)
    is_selected = Column(Boolean, default=True)
    
    cart = relationship("Cart", back_populates="items")
    variant = relationship("ProductVariant", back_populates="cart_items")

class Payment(SaleCrmBase):
    __tablename__ = "payment"
    
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_status = Column(String(255))
    payment_method = Column(String(255))
    transaction_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    order = relationship("Order", uselist=False, back_populates="payment")

class Order(SaleCrmBase):
    __tablename__ = "order"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    voucher_detail_id = Column(Integer, ForeignKey("voucher_detail.id"))
    payment_id = Column(Integer, ForeignKey("payment.id"))
    order_status = Column(Enum(OrderStatusEnum), default=OrderStatusEnum.PENDING)
    payment_method = Column(String(255))
    shipping_address = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="orders")
    voucher_detail = relationship("VoucherDetail", back_populates="orders")
    payment = relationship("Payment", back_populates="order")
    details = relationship("OrderDetail", back_populates="order")

class OrderDetail(SaleCrmBase):
    __tablename__ = "order_detail"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("order.id"), nullable=False)
    product_variant_id = Column(Integer, ForeignKey("product_variant.id"))
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    order = relationship("Order", back_populates="details")
    variant = relationship("ProductVariant", back_populates="order_details")

# --- 8. REVIEW MODULE ---

class Review(SaleCrmBase):
    __tablename__ = "review"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("product.id"))
    user_id = Column(Integer, ForeignKey("user.id"))
    content = Column(Text)
    rating = Column(Integer) # Có thể thêm CheckConstraint(rating >= 1 && rating <= 5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
    images = relationship("ImgReview", back_populates="review")

class ImgReview(SaleCrmBase):
    __tablename__ = "img_review"
    
    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("review.id"), nullable=False)
    image = Column(String(255))
    
    review = relationship("Review", back_populates="images")