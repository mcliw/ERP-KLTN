-- 1. TẠO CÁC KIỂU DỮ LIỆU ENUM
DO $$
BEGIN
    -- Loại sản phẩm
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type_enum') THEN
        CREATE TYPE product_type_enum AS ENUM ('RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOOD', 'SERVICE');
    END IF;
    -- Loại kho
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'warehouse_type_enum') THEN
        CREATE TYPE warehouse_type_enum AS ENUM ('CENTRAL', 'LOCAL', 'TRANSIT', 'BONDED', 'RETAIL');
    END IF;
    -- Trạng thái yêu cầu mua hàng (PR)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pr_status_enum') THEN
        CREATE TYPE pr_status_enum AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CONVERTED_PO');
    END IF;
    -- Trạng thái đơn đặt hàng (PO)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status_enum') THEN
        CREATE TYPE po_status_enum AS ENUM ('DRAFT', 'SENT', 'PARTIAL_RECEIVED', 'RECEIVED', 'CANCELLED', 'COMPLETED');
    END IF;
    -- Trạng thái nhập kho (GR)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gr_status_enum') THEN
        CREATE TYPE gr_status_enum AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
    END IF;
    -- Loại xuất kho (GI)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_type_enum') THEN
        CREATE TYPE issue_type_enum AS ENUM ('SALES', 'MANUFACTURING', 'TRANSFER', 'DISPOSAL', 'ADJUSTMENT');
    END IF;
    -- Trạng thái xuất kho
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gi_status_enum') THEN
        CREATE TYPE gi_status_enum AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
    END IF;
    -- Trạng thái trả hàng
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status_enum') THEN
        CREATE TYPE return_status_enum AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED');
    END IF;
    -- Trạng thái kiểm kê
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stocktake_status_enum') THEN
        CREATE TYPE stocktake_status_enum AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ADJUSTED');
    END IF;
    -- Loại giao dịch kho (cho log)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
        CREATE TYPE transaction_type_enum AS ENUM ('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'TRANSFER', 'RETURN');
    END IF;
END$$;

-- 2. DANH MỤC SẢN PHẨM & ĐỐI TÁC

-- Danh mục sản phẩm (Đệ quy)
CREATE TABLE IF NOT EXISTS product_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    parent_id INT REFERENCES product_categories(category_id)
);

-- Sản phẩm
CREATE TABLE IF NOT EXISTS products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category_id INT REFERENCES product_categories(category_id),
    unit_of_measure VARCHAR(20),
    product_type product_type_enum,
    min_stock_level INT DEFAULT 0,
    brand VARCHAR(100),
    warranty_months INT DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nhà cung cấp
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(20) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(50),
    rating DECIMAL(3,2),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    address VARCHAR(255),
    finance_partner_id INT, -- ID tham chiếu sang hệ thống Kế toán
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. QUẢN LÝ KHO BÃI (LOCATIONS)

-- Kho hàng
CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    warehouse_code VARCHAR(20) UNIQUE NOT NULL,
    warehouse_name VARCHAR(100) NOT NULL,
    warehouse_type warehouse_type_enum,
    address VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vị trí trong kho (Bin Locations)
CREATE TABLE IF NOT EXISTS bin_locations (
    bin_id SERIAL PRIMARY KEY,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
    bin_code VARCHAR(20) NOT NULL, -- Ví dụ: A-01-02
    max_capacity DECIMAL(10,2),
    UNIQUE(warehouse_id, bin_code) -- Một mã bin là duy nhất trong 1 kho
);

-- Tồn kho hiện tại (Snapshop)
CREATE TABLE IF NOT EXISTS current_stock (
    stock_id SERIAL PRIMARY KEY,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
    bin_id INT REFERENCES bin_locations(bin_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity_on_hand INT DEFAULT 0,
    quantity_allocated INT DEFAULT 0, -- Hàng đã được giữ chỗ (cho SO/Work Order)
    quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED, -- Computed column
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. QUY TRÌNH MUA HÀNG (PROCUREMENT)

-- Yêu cầu mua hàng (Purchase Request)
CREATE TABLE IF NOT EXISTS purchase_requests (
    pr_id SERIAL PRIMARY KEY,
    pr_code VARCHAR(20) UNIQUE NOT NULL,
    requester_id INT, -- ID nhân viên yêu cầu (liên kết với HRM)
    department_id INT, -- ID phòng ban (liên kết với HRM)
    request_date DATE DEFAULT CURRENT_DATE,
    reason TEXT,
    status pr_status_enum DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chi tiết Yêu cầu mua hàng
CREATE TABLE IF NOT EXISTS pr_items (
    pr_item_id SERIAL PRIMARY KEY,
    pr_id INT NOT NULL REFERENCES purchase_requests(pr_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity_requested INT NOT NULL,
    expected_date DATE
);

-- Báo giá từ nhà cung cấp (Quotations)
CREATE TABLE IF NOT EXISTS quotations (
    quotation_id SERIAL PRIMARY KEY,
    rfq_code VARCHAR(20), -- Request For Quotation Code
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id),
    pr_id INT REFERENCES purchase_requests(pr_id),
    quotation_date DATE,
    valid_until DATE,
    total_amount DECIMAL(15,2),
    status pr_status_enum, -- Tái sử dụng hoặc tạo enum riêng nếu cần
    is_selected BOOLEAN DEFAULT FALSE -- TINYINT(1) -> BOOLEAN
);

-- Đơn đặt hàng (Purchase Order)
CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id SERIAL PRIMARY KEY,
    po_code VARCHAR(20) UNIQUE NOT NULL,
    quotation_id INT REFERENCES quotations(quotation_id),
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id),
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    total_amount DECIMAL(19,4),
    tax_amount DECIMAL(19,4),
    discount_amount DECIMAL(19,4),
    status po_status_enum DEFAULT 'DRAFT',
    approved_by INT, -- ID nhân viên
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chi tiết đơn đặt hàng
CREATE TABLE IF NOT EXISTS po_items (
    po_item_id SERIAL PRIMARY KEY,
    po_id INT NOT NULL REFERENCES purchase_orders(po_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    quantity_ordered INT NOT NULL,
    quantity_received INT DEFAULT 0,
    unit_price DECIMAL(19,4) NOT NULL,
    total_line_amount DECIMAL(19,4) -- Thường = quantity * unit_price
);

-- 5. QUY TRÌNH NHẬP - XUẤT KHO (INVENTORY MOVEMENTS)

-- Nhập kho (Goods Receipt)
CREATE TABLE IF NOT EXISTS goods_receipts (
    gr_id SERIAL PRIMARY KEY,
    gr_code VARCHAR(20) UNIQUE NOT NULL,
    po_id INT REFERENCES purchase_orders(po_id),
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
    receipt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received_by INT,
    status gr_status_enum DEFAULT 'DRAFT',
    finance_journal_entry_id BIGINT -- ID bút toán kế toán
);

-- Chi tiết nhập kho
CREATE TABLE IF NOT EXISTS gr_items (
    gr_item_id SERIAL PRIMARY KEY,
    gr_id INT NOT NULL REFERENCES goods_receipts(gr_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    bin_id INT REFERENCES bin_locations(bin_id), -- Nhập vào vị trí nào
    quantity_received INT NOT NULL,
    rejected_quantity INT DEFAULT 0,
    batch_number VARCHAR(50),
    serial_number VARCHAR(50)
);

-- Xuất kho (Goods Issue)
CREATE TABLE IF NOT EXISTS goods_issues (
    gi_id SERIAL PRIMARY KEY,
    gi_code VARCHAR(20) UNIQUE NOT NULL,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
    issue_type issue_type_enum NOT NULL,
    reference_doc_id VARCHAR(50), -- Ví dụ: Mã đơn hàng bán (SO), Mã lệnh sản xuất
    issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status gi_status_enum DEFAULT 'DRAFT',
    finance_journal_entry_id BIGINT
);

-- Chi tiết xuất kho
CREATE TABLE IF NOT EXISTS gi_items (
    gi_item_id SERIAL PRIMARY KEY,
    gi_id INT NOT NULL REFERENCES goods_issues(gi_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    bin_id INT REFERENCES bin_locations(bin_id), -- Lấy từ vị trí nào
    quantity_issued INT NOT NULL
);

-- 6. CÁC NGHIỆP VỤ KHÁC (TRẢ HÀNG, KIỂM KÊ, LOG)

-- Trả hàng mua (Purchase Returns)
CREATE TABLE IF NOT EXISTS purchase_returns (
    return_id SERIAL PRIMARY KEY,
    return_code VARCHAR(20) UNIQUE NOT NULL,
    po_id INT REFERENCES purchase_orders(po_id),
    supplier_id INT REFERENCES suppliers(supplier_id),
    return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    status return_status_enum DEFAULT 'PENDING',
    finance_journal_entry_id BIGINT
);

-- Kiểm kê kho (Stocktakes)
CREATE TABLE IF NOT EXISTS stocktakes (
    stocktake_id SERIAL PRIMARY KEY,
    stocktake_code VARCHAR(20) UNIQUE NOT NULL,
    warehouse_id INT NOT NULL REFERENCES warehouses(warehouse_id),
    start_date DATE,
    end_date DATE,
    status stocktake_status_enum DEFAULT 'PLANNED'
);

-- Chi tiết kiểm kê
CREATE TABLE IF NOT EXISTS stocktake_details (
    detail_id SERIAL PRIMARY KEY,
    stocktake_id INT NOT NULL REFERENCES stocktakes(stocktake_id),
    product_id INT NOT NULL REFERENCES products(product_id),
    system_quantity INT, -- Số lượng trên phần mềm lúc bắt đầu kiểm
    actual_quantity INT, -- Số lượng thực tế đếm được
    difference INT GENERATED ALWAYS AS (actual_quantity - system_quantity) STORED
);

-- Nhật ký giao dịch kho (Inventory Transaction Logs - Audit Trail)
CREATE TABLE IF NOT EXISTS inventory_transaction_logs (
    log_id BIGSERIAL PRIMARY KEY, -- Sử dụng BIGSERIAL cho bảng log lớn
    transaction_type transaction_type_enum NOT NULL,
    product_id INT NOT NULL REFERENCES products(product_id),
    warehouse_id INT REFERENCES warehouses(warehouse_id),
    bin_id INT REFERENCES bin_locations(bin_id),
    quantity_change INT NOT NULL, -- Số dương (tăng) hoặc âm (giảm)
    reference_code VARCHAR(50), -- Mã GR, GI, Stocktake, v.v.
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by INT -- User thực hiện
);