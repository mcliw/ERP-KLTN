-- =================================================================
-- V1__Init_SupplyChain_Schema.sql
-- SYNCHRONIZED WITH JAVA ENTITIES
-- =================================================================

-- 1. TẠO CÁC KIỂU DỮ LIỆU ENUM
DO $$
BEGIN
    -- entity/enums/ProductType.java
    CREATE TYPE product_type_enum AS ENUM ('RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOOD', 'SERVICE');
    
    -- entity/enums/WarehouseType.java
    CREATE TYPE warehouse_type_enum AS ENUM ('CENTRAL', 'LOCAL', 'TRANSIT', 'BONDED', 'RETAIL');
    
    -- entity/enums/PrStatus.java
    CREATE TYPE pr_status_enum AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CONVERTED_PO');
    
    -- entity/enums/PoStatus.java
    CREATE TYPE po_status_enum AS ENUM ('DRAFT', 'SENT', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED', 'COMPLETED', 'APPROVED');
    
    -- entity/enums/GrStatus.java
    CREATE TYPE gr_status_enum AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
    
    -- entity/enums/IssueType.java
    CREATE TYPE issue_type_enum AS ENUM ('SALES', 'MANUFACTURING', 'TRANSFER', 'DISPOSAL', 'ADJUSTMENT');
    
    -- entity/enums/GiStatus.java
    CREATE TYPE gi_status_enum AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
    
    -- entity/enums/ReturnStatus.java
    CREATE TYPE return_status_enum AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED');
    
    -- entity/enums/StocktakeStatus.java
    CREATE TYPE stocktake_status_enum AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ADJUSTED');
    
    -- entity/enums/TransactionType.java
    CREATE TYPE transaction_type_enum AS ENUM ('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER', 'RETURN');
EXCEPTION
    WHEN duplicate_object THEN null;
END$$;

-- 2. DANH MỤC SẢN PHẨM & ĐỐI TÁC

-- entity/ProductCategory.java
CREATE TABLE IF NOT EXISTS product_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL,
    parent_id INT REFERENCES product_categories(category_id),
    description TEXT,
    status VARCHAR(255) -- String trong Java
);

-- entity/Product.java
CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(255) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category_id INT REFERENCES product_categories(category_id),
    unit_of_measure VARCHAR(255),
    product_type product_type_enum,
    min_stock_level INT,
    brand VARCHAR(255),
    warranty_months INT,
    image_url VARCHAR(255),
    description TEXT,
    status VARCHAR(255), -- String trong Java
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- BaseEntity
);

-- entity/Supplier.java
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(255) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(255),
    rating NUMERIC(19, 4), -- BigDecimal
    contact_email VARCHAR(255),
    contact_phone VARCHAR(255),
    address VARCHAR(255),
    finance_partner_id INT,
    note TEXT,
    status VARCHAR(255), -- String trong Java
    contract_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- BaseEntity
);

-- 3. QUẢN LÝ KHO BÃI (LOCATIONS)

-- entity/Warehouse.java
CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    warehouse_code VARCHAR(255) UNIQUE NOT NULL,
    warehouse_name VARCHAR(255) NOT NULL,
    warehouse_type warehouse_type_enum,
    address VARCHAR(255),
    is_active BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- BaseEntity
);

-- entity/BinLocation.java
CREATE TABLE IF NOT EXISTS bin_locations (
    bin_id SERIAL PRIMARY KEY,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
    bin_code VARCHAR(255) NOT NULL,
    max_capacity NUMERIC(19, 4), -- BigDecimal
    description TEXT,
    is_active BOOLEAN
);

-- entity/CurrentStock.java
CREATE TABLE IF NOT EXISTS current_stock (
    stock_id SERIAL PRIMARY KEY,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
    bin_id INT REFERENCES bin_locations(bin_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity_on_hand INT,
    quantity_allocated INT,
    -- Computed Column: Java insertable=false, updatable=false
    quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED,
    notes TEXT,
    updated_at TIMESTAMP
);

-- 4. QUY TRÌNH MUA HÀNG (PROCUREMENT)

-- entity/PurchaseRequest.java
CREATE TABLE IF NOT EXISTS purchase_requests (
    pr_id SERIAL PRIMARY KEY,
    pr_code VARCHAR(255) UNIQUE NOT NULL,
    requester_id INT, -- Loose coupling with HRM
    department_id INT, -- Loose coupling with HRM
    request_date DATE,
    reason VARCHAR(255),
    status pr_status_enum,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- BaseEntity
);

-- entity/PrItem.java
CREATE TABLE IF NOT EXISTS pr_items (
    pr_item_id SERIAL PRIMARY KEY,
    pr_id INT NOT NULL REFERENCES purchase_requests(pr_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity_requested INT NOT NULL,
    expected_date DATE
);

-- entity/Quotation.java
CREATE TABLE IF NOT EXISTS quotations (
    quotation_id SERIAL PRIMARY KEY,
    quotation_code VARCHAR(255) UNIQUE NOT NULL,
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id),
    quotation_date DATE,
    valid_until DATE,
    total_amount NUMERIC(19, 4), -- BigDecimal
    notes VARCHAR(255),
    pr_id INT REFERENCES purchase_requests(pr_id),
    is_selected BOOLEAN,
    status VARCHAR(255), -- Lưu ý: Trong Java là String, không phải Enum
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- BaseEntity
);

-- entity/QuotationItem.java
CREATE TABLE IF NOT EXISTS quotation_items (
    quotation_item_id SERIAL PRIMARY KEY,
    quotation_id INT NOT NULL REFERENCES quotations(quotation_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity INT NOT NULL,
    unit_price NUMERIC(19, 4),
    -- Computed Column: Java insertable=false, updatable=false
    total_line NUMERIC(19, 4) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- entity/PurchaseOrder.java
CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id SERIAL PRIMARY KEY,
    po_code VARCHAR(255) UNIQUE NOT NULL,
    quotation_id INT REFERENCES quotations(quotation_id),
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id),
    order_date DATE,
    expected_delivery_date DATE,
    total_amount NUMERIC(19, 4),
    tax_amount NUMERIC(19, 4),
    discount_amount NUMERIC(19, 4),
    status po_status_enum,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- BaseEntity
);

-- entity/PoItem.java
CREATE TABLE IF NOT EXISTS po_items (
    po_item_id SERIAL PRIMARY KEY,
    po_id INT NOT NULL REFERENCES purchase_orders(po_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity_ordered INT NOT NULL,
    quantity_received INT,
    unit_price NUMERIC(19, 4) NOT NULL,
    total_line_amount NUMERIC(19, 4)
);

-- 5. QUY TRÌNH NHẬP KHO (INBOUND)

-- entity/GoodsReceipt.java
CREATE TABLE IF NOT EXISTS goods_receipts (
    gr_id SERIAL PRIMARY KEY,
    gr_code VARCHAR(255) UNIQUE NOT NULL,
    po_id INT REFERENCES purchase_orders(po_id),
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
    receipt_date TIMESTAMP,
    status gr_status_enum
    -- Lưu ý: Java Entity không có finance_journal_entry_id nên không tạo cột
);

-- entity/GrItem.java
CREATE TABLE IF NOT EXISTS gr_items (
    gr_item_id SERIAL PRIMARY KEY,
    gr_id INT NOT NULL REFERENCES goods_receipts(gr_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    bin_id INT REFERENCES bin_locations(bin_id),
    quantity_received INT NOT NULL,
    batch_number VARCHAR(255)
);

-- 6. KIỂM KÊ VÀ LOGS

-- entity/Stocktake.java
CREATE TABLE IF NOT EXISTS stocktakes (
    stocktake_id SERIAL PRIMARY KEY,
    stocktake_code VARCHAR(255) UNIQUE NOT NULL,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
    stocktake_date DATE,
    status stocktake_status_enum,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- BaseEntity
);

-- entity/StocktakeDetail.java
CREATE TABLE IF NOT EXISTS stocktake_details (
    detail_id SERIAL PRIMARY KEY,
    stocktake_id INT NOT NULL REFERENCES stocktakes(stocktake_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    system_quantity INT,
    actual_quantity INT,
    -- Computed Column
    difference INT GENERATED ALWAYS AS (actual_quantity - system_quantity) STORED
);

-- entity/InventoryLog.java
CREATE TABLE IF NOT EXISTS inventory_transaction_logs (
    log_id BIGSERIAL PRIMARY KEY,
    transaction_type transaction_type_enum NOT NULL,
    product_id INT NOT NULL REFERENCES products(product_id),
    warehouse_id INT REFERENCES warehouses(warehouse_id),
    bin_id INT REFERENCES bin_locations(bin_id),
    quantity_change INT NOT NULL,
    reference_code VARCHAR(255),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- @CreationTimestamp
    performed_by INT
);

-- 7. CÁC BẢNG KHÔNG CÓ ENTITY NHƯNG CÓ TRONG SQL GỐC & ENUM
-- (Giữ lại để đảm bảo tính toàn vẹn hệ thống nếu chưa cung cấp Entity file)

-- Goods Issue (Xuất kho) - Dựa trên IssueType và GiStatus
CREATE TABLE IF NOT EXISTS goods_issues (
    gi_id SERIAL PRIMARY KEY,
    gi_code VARCHAR(255) UNIQUE NOT NULL,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
    issue_type issue_type_enum NOT NULL,
    reference_doc_id VARCHAR(255),
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status gi_status_enum DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gi_items (
    gi_item_id SERIAL PRIMARY KEY,
    gi_id INT NOT NULL REFERENCES goods_issues(gi_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    bin_id INT REFERENCES bin_locations(bin_id),
    quantity_issued INT NOT NULL
);

-- Purchase Return (Trả hàng) - Dựa trên ReturnStatus
CREATE TABLE IF NOT EXISTS purchase_returns (
    return_id SERIAL PRIMARY KEY,
    return_code VARCHAR(255) UNIQUE NOT NULL,
    po_id INT REFERENCES purchase_orders(po_id),
    supplier_id INT REFERENCES suppliers(supplier_id),
    return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    status return_status_enum DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);