from __future__ import annotations
import enum
from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, Date, Text, Enum, Numeric, UniqueConstraint, Computed
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.supply_chain_database import SupplyChainBase

# --- 1. ENUM DEFINITIONS ---

class ProductTypeEnum(str, enum.Enum):
    RAW_MATERIAL = "RAW_MATERIAL"
    SEMI_FINISHED = "SEMI_FINISHED"
    FINISHED_GOOD = "FINISHED_GOOD"
    SERVICE = "SERVICE"

class WarehouseTypeEnum(str, enum.Enum):
    CENTRAL = "CENTRAL"
    LOCAL = "LOCAL"
    TRANSIT = "TRANSIT"
    BONDED = "BONDED"
    RETAIL = "RETAIL"

class PRStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CONVERTED_PO = "CONVERTED_PO"

class POStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PARTIAL_RECEIVED = "PARTIAL_RECEIVED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"

class GRStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class IssueTypeEnum(str, enum.Enum):
    SALES = "SALES"
    MANUFACTURING = "MANUFACTURING"
    TRANSFER = "TRANSFER"
    DISPOSAL = "DISPOSAL"
    ADJUSTMENT = "ADJUSTMENT"

class GIStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class ReturnStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"

class StocktakeStatusEnum(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ADJUSTED = "ADJUSTED"

class TransactionTypeEnum(str, enum.Enum):
    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"
    ADJUSTMENT = "ADJUSTMENT"
    TRANSFER = "TRANSFER"
    RETURN = "RETURN"

# --- 2. PRODUCT & PARTNERS ---

class ProductCategory(SupplyChainBase):
    __tablename__ = "product_categories"
    
    category_id = Column(Integer, primary_key=True, index=True)
    category_name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey("product_categories.category_id"), nullable=True)
    
    parent = relationship("ProductCategory", remote_side=[category_id], backref="children")
    products = relationship("Product", back_populates="category")

class Product(SupplyChainBase):
    __tablename__ = "products"
    
    product_id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("product_categories.category_id"))
    unit_of_measure = Column(String(20))
    product_type = Column(Enum(ProductTypeEnum))
    min_stock_level = Column(Integer, default=0)
    brand = Column(String(100))
    warranty_months = Column(Integer, default=0)
    image_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    category = relationship("ProductCategory", back_populates="products")
    current_stock = relationship("CurrentStock", back_populates="product")
    pr_items = relationship("PRItem", back_populates="product")
    po_items = relationship("POItem", back_populates="product")
    gr_items = relationship("GRItem", back_populates="product")
    gi_items = relationship("GIItem", back_populates="product")
    transaction_logs = relationship("InventoryTransactionLog", back_populates="product")

class Supplier(SupplyChainBase):
    __tablename__ = "suppliers"
    
    supplier_id = Column(Integer, primary_key=True, index=True)
    supplier_code = Column(String(20), unique=True, nullable=False)
    supplier_name = Column(String(255), nullable=False)
    tax_code = Column(String(50))
    rating = Column(Numeric(3, 2))
    contact_email = Column(String(100))
    contact_phone = Column(String(20))
    address = Column(String(255))
    finance_partner_id = Column(Integer) # Link to Finance Module
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    quotations = relationship("Quotation", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

# --- 3. WAREHOUSE & LOCATIONS ---

class Warehouse(SupplyChainBase):
    __tablename__ = "warehouses"
    
    warehouse_id = Column(Integer, primary_key=True, index=True)
    warehouse_code = Column(String(20), unique=True, nullable=False)
    warehouse_name = Column(String(100), nullable=False)
    warehouse_type = Column(Enum(WarehouseTypeEnum))
    address = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    bins = relationship("BinLocation", back_populates="warehouse")
    current_stock = relationship("CurrentStock", back_populates="warehouse")
    goods_receipts = relationship("GoodsReceipt", back_populates="warehouse")
    goods_issues = relationship("GoodsIssue", back_populates="warehouse")

class BinLocation(SupplyChainBase):
    __tablename__ = "bin_locations"
    __table_args__ = (UniqueConstraint('warehouse_id', 'bin_code', name='_warehouse_bin_uc'),)
    
    bin_id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    bin_code = Column(String(20), nullable=False)
    max_capacity = Column(Numeric(10, 2))
    
    warehouse = relationship("Warehouse", back_populates="bins")
    current_stock = relationship("CurrentStock", back_populates="bin")

class CurrentStock(SupplyChainBase):
    __tablename__ = "current_stock"
    
    stock_id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bin_locations.bin_id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity_on_hand = Column(Integer, default=0)
    quantity_allocated = Column(Integer, default=0)
    # Generated column trong SQL, ở đây mapping read-only hoặc tính toán
    quantity_available = Column(Integer, Computed("quantity_on_hand - quantity_allocated"))
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    warehouse = relationship("Warehouse", back_populates="current_stock")
    bin = relationship("BinLocation", back_populates="current_stock")
    product = relationship("Product", back_populates="current_stock")

# --- 4. PROCUREMENT (PR -> PO) ---

class PurchaseRequest(SupplyChainBase):
    __tablename__ = "purchase_requests"
    
    pr_id = Column(Integer, primary_key=True, index=True)
    pr_code = Column(String(20), unique=True, nullable=False)
    requester_id = Column(Integer) # Link to HR Module (Employee)
    department_id = Column(Integer) # Link to HR Module (Dept)
    request_date = Column(Date, server_default=func.current_date())
    reason = Column(Text)
    status = Column(Enum(PRStatusEnum), default=PRStatusEnum.DRAFT)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    items = relationship("PRItem", back_populates="pr", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="pr")

class PRItem(SupplyChainBase):
    __tablename__ = "pr_items"
    
    pr_item_id = Column(Integer, primary_key=True, index=True)
    pr_id = Column(Integer, ForeignKey("purchase_requests.pr_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity_requested = Column(Integer, nullable=False)
    expected_date = Column(Date)
    
    pr = relationship("PurchaseRequest", back_populates="items")
    product = relationship("Product", back_populates="pr_items")

class Quotation(SupplyChainBase):
    __tablename__ = "quotations"
    
    quotation_id = Column(Integer, primary_key=True, index=True)
    rfq_code = Column(String(20))
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=False)
    pr_id = Column(Integer, ForeignKey("purchase_requests.pr_id"))
    quotation_date = Column(Date)
    valid_until = Column(Date)
    total_amount = Column(Numeric(15, 2))
    status = Column(String(20)) # Có thể dùng Enum nếu muốn
    is_selected = Column(Boolean, default=False)
    
    supplier = relationship("Supplier", back_populates="quotations")
    pr = relationship("PurchaseRequest", back_populates="quotations")
    purchase_orders = relationship("PurchaseOrder", back_populates="quotation")

class PurchaseOrder(SupplyChainBase):
    __tablename__ = "purchase_orders"
    
    po_id = Column(Integer, primary_key=True, index=True)
    po_code = Column(String(20), unique=True, nullable=False)
    quotation_id = Column(Integer, ForeignKey("quotations.quotation_id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=False)
    order_date = Column(Date, server_default=func.current_date())
    expected_delivery_date = Column(Date)
    total_amount = Column(Numeric(19, 4))
    tax_amount = Column(Numeric(19, 4))
    discount_amount = Column(Numeric(19, 4))
    status = Column(Enum(POStatusEnum), default=POStatusEnum.DRAFT)
    approved_by = Column(Integer) # Link HR
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    quotation = relationship("Quotation", back_populates="purchase_orders")
    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("POItem", back_populates="po", cascade="all, delete-orphan")
    goods_receipts = relationship("GoodsReceipt", back_populates="po")

class POItem(SupplyChainBase):
    __tablename__ = "po_items"
    
    po_item_id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.po_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0)
    unit_price = Column(Numeric(19, 4), nullable=False)
    total_line_amount = Column(Numeric(19, 4))
    
    po = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", back_populates="po_items")

# --- 5. INVENTORY MOVEMENTS (GR/GI) ---

class GoodsReceipt(SupplyChainBase):
    __tablename__ = "goods_receipts"
    
    gr_id = Column(Integer, primary_key=True, index=True)
    gr_code = Column(String(20), unique=True, nullable=False)
    po_id = Column(Integer, ForeignKey("purchase_orders.po_id"))
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    receipt_date = Column(DateTime(timezone=True), server_default=func.now())
    received_by = Column(Integer) # Link HR
    status = Column(Enum(GRStatusEnum), default=GRStatusEnum.DRAFT)
    finance_journal_entry_id = Column(Integer) # Link Finance
    
    po = relationship("PurchaseOrder", back_populates="goods_receipts")
    warehouse = relationship("Warehouse", back_populates="goods_receipts")
    items = relationship("GRItem", back_populates="gr", cascade="all, delete-orphan")

class GRItem(SupplyChainBase):
    __tablename__ = "gr_items"
    
    gr_item_id = Column(Integer, primary_key=True, index=True)
    gr_id = Column(Integer, ForeignKey("goods_receipts.gr_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bin_locations.bin_id"))
    quantity_received = Column(Integer, nullable=False)
    rejected_quantity = Column(Integer, default=0)
    batch_number = Column(String(50))
    serial_number = Column(String(50))
    
    gr = relationship("GoodsReceipt", back_populates="items")
    product = relationship("Product", back_populates="gr_items")

class GoodsIssue(SupplyChainBase):
    __tablename__ = "goods_issues"
    
    gi_id = Column(Integer, primary_key=True, index=True)
    gi_code = Column(String(20), unique=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    issue_type = Column(Enum(IssueTypeEnum), nullable=False)
    reference_doc_id = Column(String(50))
    issue_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(Enum(GIStatusEnum), default=GIStatusEnum.DRAFT)
    finance_journal_entry_id = Column(Integer)
    
    warehouse = relationship("Warehouse", back_populates="goods_issues")
    items = relationship("GIItem", back_populates="gi", cascade="all, delete-orphan")

class GIItem(SupplyChainBase):
    __tablename__ = "gi_items"
    
    gi_item_id = Column(Integer, primary_key=True, index=True)
    gi_id = Column(Integer, ForeignKey("goods_issues.gi_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    bin_id = Column(Integer, ForeignKey("bin_locations.bin_id"))
    quantity_issued = Column(Integer, nullable=False)
    
    gi = relationship("GoodsIssue", back_populates="items")
    product = relationship("Product", back_populates="gi_items")

# --- 6. STOCKTAKE & LOGS ---

class Stocktake(SupplyChainBase):
    __tablename__ = "stocktakes"
    
    stocktake_id = Column(Integer, primary_key=True, index=True)
    stocktake_code = Column(String(20), unique=True, nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"), nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(Enum(StocktakeStatusEnum), default=StocktakeStatusEnum.PLANNED)
    
    details = relationship("StocktakeDetail", back_populates="stocktake", cascade="all, delete-orphan")

class StocktakeDetail(SupplyChainBase):
    __tablename__ = "stocktake_details"
    
    detail_id = Column(Integer, primary_key=True, index=True)
    stocktake_id = Column(Integer, ForeignKey("stocktakes.stocktake_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    system_quantity = Column(Integer)
    actual_quantity = Column(Integer)
    # Computed column cho chênh lệch
    difference = Column(Integer, Computed("actual_quantity - system_quantity"))
    
    stocktake = relationship("Stocktake", back_populates="details")
    product = relationship("Product") # One-way relationship

class InventoryTransactionLog(SupplyChainBase):
    __tablename__ = "inventory_transaction_logs"
    
    log_id = Column(Integer, primary_key=True, index=True) # Postgres BIGSERIAL -> Integer/BigInteger
    transaction_type = Column(Enum(TransactionTypeEnum), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.warehouse_id"))
    bin_id = Column(Integer, ForeignKey("bin_locations.bin_id"))
    quantity_change = Column(Integer, nullable=False)
    reference_code = Column(String(50))
    transaction_date = Column(DateTime(timezone=True), server_default=func.now())
    performed_by = Column(Integer) # Link HR
    
    product = relationship("Product", back_populates="transaction_logs")