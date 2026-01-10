from sqlalchemy import (
    Column, Integer, BigInteger, String, Date, DateTime,
    Enum, Boolean, ForeignKey, DECIMAL, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.supply_chain_database import SupplyChainBase

class Warehouse(SupplyChainBase):
    __tablename__ = "warehouses"

    warehouse_id = Column(Integer, primary_key=True)
    warehouse_code = Column(String(20), unique=True, nullable=False)
    warehouse_name = Column(String(100), nullable=False)
    warehouse_type = Column(
        Enum("TRADING", "ASSET", "TRANSIT", name="warehouse_type_enum"),
        nullable=False
    )
    address = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    bins = relationship("BinLocation", back_populates="warehouse")

class BinLocation(SupplyChainBase):
    __tablename__ = "bin_locations"

    bin_id = Column(Integer, primary_key=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    bin_code = Column(String(20), nullable=False)
    description = Column(String(100))
    max_capacity = Column(DECIMAL(10, 2))

    warehouse = relationship("Warehouse", back_populates="bins")

class ProductCategory(SupplyChainBase):
    __tablename__ = "product_categories"

    category_id = Column(Integer, primary_key=True)
    category_name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey("product_categories.category_id"))

    parent = relationship("ProductCategory", remote_side=[category_id])

class Product(SupplyChainBase):
    __tablename__ = "products"

    product_id = Column(Integer, primary_key=True)
    sku = Column(String(50), unique=True, nullable=False)
    product_name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("product_categories.category_id"))
    unit_of_measure = Column(String(20))
    product_type = Column(
        Enum("TRADING_GOODS", "COMPANY_ASSET", name="product_type_enum"),
        nullable=False
    )
    min_stock_level = Column(Integer, default=0)
    brand = Column(String(100))
    warranty_months = Column(Integer, default=12)
    image_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("ProductCategory")

class Supplier(SupplyChainBase):
    __tablename__ = "suppliers"

    supplier_id = Column(Integer, primary_key=True)
    supplier_code = Column(String(20), unique=True, nullable=False)
    supplier_name = Column(String(255), nullable=False)
    tax_code = Column(String(50))
    contact_email = Column(String(100))
    contact_phone = Column(String(20))
    address = Column(String(255))
    rating = Column(DECIMAL(3, 2), default=0)
    finance_partner_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class PurchaseRequest(SupplyChainBase):
    __tablename__ = "purchase_requests"

    pr_id = Column(Integer, primary_key=True)
    pr_code = Column(String(20), unique=True, nullable=False)
    requester_id = Column(Integer, nullable=False)
    department_id = Column(Integer)
    request_date = Column(Date, nullable=False)
    reason = Column(Text)
    status = Column(
        Enum(
            "DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PROCESSED",
            name="pr_status_enum"
        ),
        default="DRAFT"
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("PRItem", back_populates="pr")

class PRItem(SupplyChainBase):
    __tablename__ = "pr_items"

    pr_item_id = Column(Integer, primary_key=True)
    pr_id = Column(Integer, ForeignKey("purchase_requests.pr_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity_requested = Column(Integer, nullable=False)
    expected_date = Column(Date)

    pr = relationship("PurchaseRequest", back_populates="items")
    product = relationship("Product")

class Quotation(SupplyChainBase):
    __tablename__ = "quotations"

    quotation_id = Column(Integer, primary_key=True)
    rfq_code = Column(String(20))
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=False)
    pr_id = Column(Integer, ForeignKey("purchase_requests.pr_id"))
    quotation_date = Column(Date)
    valid_until = Column(Date)
    total_amount = Column(DECIMAL(15, 2))
    status = Column(
        Enum("PENDING", "ACCEPTED", "REJECTED", name="quotation_status_enum"),
        default="PENDING"
    )
    is_selected = Column(Boolean, default=False)

    supplier = relationship("Supplier")
    pr = relationship("PurchaseRequest")

class PurchaseOrder(SupplyChainBase):
    __tablename__ = "purchase_orders"

    po_id = Column(Integer, primary_key=True)
    po_code = Column(String(20), unique=True, nullable=False)
    quotation_id = Column(Integer, ForeignKey("quotations.quotation_id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=False)
    order_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date)
    total_amount = Column(DECIMAL(19, 4), nullable=False)
    tax_amount = Column(DECIMAL(19, 4), default=0)
    discount_amount = Column(DECIMAL(19, 4), default=0)
    status = Column(
        Enum(
            "DRAFT", "APPROVED", "PARTIAL_RECEIVED", "COMPLETED", "CANCELLED",
            name="po_status_enum"
        ),
        default="DRAFT"
    )
    approved_by = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    supplier = relationship("Supplier")
    items = relationship("POItem", back_populates="po")

class POItem(SupplyChainBase):
    __tablename__ = "po_items"

    po_item_id = Column(Integer, primary_key=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.po_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0)
    unit_price = Column(DECIMAL(19, 4), nullable=False)

    po = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")

class GoodsReceipt(SupplyChainBase):
    __tablename__ = "goods_receipts"

    gr_id = Column(Integer, primary_key=True)
    gr_code = Column(String(20), unique=True, nullable=False)
    po_id = Column(Integer, ForeignKey("purchase_orders.po_id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    receipt_date = Column(DateTime, default=datetime.utcnow)
    received_by = Column(Integer)
    status = Column(
        Enum("DRAFT", "CONFIRMED", name="gr_status_enum"),
        default="DRAFT"
    )
    finance_journal_entry_id = Column(BigInteger)

    items = relationship("GRItem", back_populates="gr")

class GRItem(SupplyChainBase):
    __tablename__ = "gr_items"

    gr_item_id = Column(Integer, primary_key=True)
    gr_id = Column(Integer, ForeignKey("goods_receipts.gr_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bin_locations.bin_id"))
    quantity_received = Column(Integer, nullable=False)
    rejected_quantity = Column(Integer, default=0)
    batch_number = Column(String(50))
    serial_number = Column(String(50))

    gr = relationship("GoodsReceipt", back_populates="items")
    product = relationship("Product")

class GoodsIssue(SupplyChainBase):
    __tablename__ = "goods_issues"

    gi_id = Column(Integer, primary_key=True)
    gi_code = Column(String(20), unique=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    issue_type = Column(
        Enum(
            "SALES_ORDER", "INTERNAL_USE", "TRANSFER", "RETURN_TO_VENDOR",
            name="gi_type_enum"
        ),
        nullable=False
    )
    reference_doc_id = Column(String(50))
    issue_date = Column(DateTime, default=datetime.utcnow)
    status = Column(
        Enum("DRAFT", "CONFIRMED", name="gi_status_enum"),
        default="DRAFT"
    )
    finance_journal_entry_id = Column(BigInteger)

    items = relationship("GIItem", back_populates="gi")

class GIItem(SupplyChainBase):
    __tablename__ = "gi_items"

    gi_item_id = Column(Integer, primary_key=True)
    gi_id = Column(Integer, ForeignKey("goods_issues.gi_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bin_locations.bin_id"), nullable=False)
    quantity_issued = Column(Integer, nullable=False)

    gi = relationship("GoodsIssue", back_populates="items")

class CurrentStock(SupplyChainBase):
    __tablename__ = "current_stock"
    __table_args__ = (
        UniqueConstraint("warehouse_id", "bin_id", "product_id"),
    )

    stock_id = Column(Integer, primary_key=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bin_locations.bin_id"))
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity_on_hand = Column(Integer, default=0)
    quantity_allocated = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class InventoryTransactionLog(SupplyChainBase):
    __tablename__ = "inventory_transaction_logs"

    log_id = Column(BigInteger, primary_key=True)
    transaction_type = Column(
        Enum(
            "INBOUND", "OUTBOUND", "ADJUSTMENT", "TRANSFER",
            name="inventory_tx_type_enum"
        ),
        nullable=False
    )
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bin_locations.bin_id"))
    quantity_change = Column(Integer, nullable=False)
    reference_code = Column(String(50))
    transaction_date = Column(DateTime, default=datetime.utcnow)
    performed_by = Column(Integer)

class Stocktake(SupplyChainBase):
    __tablename__ = "stocktakes"

    stocktake_id = Column(Integer, primary_key=True)
    stocktake_code = Column(String(20), unique=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    status = Column(
        Enum(
            "IN_PROGRESS", "COMPLETED", "ADJUSTED",
            name="stocktake_status_enum"
        ),
        default="IN_PROGRESS"
    )

    details = relationship("StocktakeDetail", back_populates="stocktake")

class StocktakeDetail(SupplyChainBase):
    __tablename__ = "stocktake_details"

    detail_id = Column(Integer, primary_key=True)
    stocktake_id = Column(Integer, ForeignKey("stocktakes.stocktake_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    system_quantity = Column(Integer, nullable=False)
    actual_quantity = Column(Integer, nullable=False)

    stocktake = relationship("Stocktake", back_populates="details")

class PurchaseReturn(SupplyChainBase):
    __tablename__ = "purchase_returns"

    return_id = Column(Integer, primary_key=True)
    return_code = Column(String(20), unique=True, nullable=False)
    po_id = Column(Integer, ForeignKey("purchase_orders.po_id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=False)
    return_date = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text)
    status = Column(
        Enum("DRAFT", "CONFIRMED", name="purchase_return_status_enum"),
        default="DRAFT"
    )
    finance_journal_entry_id = Column(BigInteger)
