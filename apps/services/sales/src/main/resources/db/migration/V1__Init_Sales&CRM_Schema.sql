-- =======================================================================================
-- FILE: V1__Init_Sales_CRM_Schema.sql
-- SYNCHRONIZED WITH JAVA ENTITIES
-- =======================================================================================

-- 0. CẤU HÌNH EXTENSION & ENUM
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- Bắt buộc để dùng gen_random_uuid()

DO $$
BEGIN
    -- Role cho User hệ thống (Auth)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
        CREATE TYPE role_enum AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');
    END IF;

    -- Loại giảm giá (dùng cho Voucher - Java dùng String nhưng DB có thể dùng Enum hoặc Varchar, ở đây dùng Varchar theo Entity)
    -- Giữ lại Enum nếu muốn validate chặt chẽ ở DB, nhưng Entity khai báo String nên ta dùng VARCHAR cho linh hoạt
END$$;

-- 1. PHÂN HỆ NGƯỜI DÙNG HỆ THỐNG (AUTH)
-- (Giữ nguyên vì không có Entity đối chiếu, cần thiết cho hệ thống)

CREATE TABLE IF NOT EXISTS role (
    id SERIAL PRIMARY KEY,
    role_name role_enum NOT NULL DEFAULT 'CUSTOMER'
);

CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    role_id INT REFERENCES role(id),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS address (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES "user"(id),
    city VARCHAR(255),
    district VARCHAR(255),
    ward VARCHAR(255),
    street_address VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE
);

-- 2. PHÂN HỆ KHÁCH HÀNG CRM
-- Entity: erp.company.sales.entity.Customer

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- @Column(unique = true, nullable = false)
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(255),
    address VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 3. PHÂN HỆ TIN TỨC (CMS)
-- (Giữ nguyên)

CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    author_id INT REFERENCES "user"(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    thumbnail VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_block (
    id SERIAL PRIMARY KEY,
    news_id INT NOT NULL REFERENCES news(id),
    sort_order INT DEFAULT 0,
    content TEXT,
    img_content VARCHAR(255),
    caption_img VARCHAR(255)
);

-- 4. PHÂN HỆ DANH MỤC SẢN PHẨM (CATALOG)
-- (Giữ nguyên cấu trúc để hỗ trợ ProductVariant trong OrderDetail)

CREATE TABLE IF NOT EXISTS unit (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(25) NOT NULL
);

CREATE TABLE IF NOT EXISTS brand (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    logo VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS category (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES category(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    icon_emoji VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS attribute (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit_id INT REFERENCES unit(id)
);

CREATE TABLE IF NOT EXISTS cate_brand_link (
    id SERIAL PRIMARY KEY,
    brand_id INT REFERENCES brand(id),
    category_id INT REFERENCES category(id),
    UNIQUE(brand_id, category_id)
);

CREATE TABLE IF NOT EXISTS cate_attribute_link (
    id SERIAL PRIMARY KEY,
    attribute_id INT REFERENCES attribute(id),
    category_id INT REFERENCES category(id)
);

-- 5. PHÂN HỆ SẢN PHẨM (PRODUCT)
-- (Giữ nguyên cấu trúc)

CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    cate_brand_link_id INT REFERENCES cate_brand_link(id),
    name VARCHAR(255) NOT NULL,
    avg_rating NUMERIC(2,1) DEFAULT 0,
    total_sold INT DEFAULT 0,
    total_stock INT DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product_attribute_value (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id),
    attribute_id INT REFERENCES attribute(id),
    value VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS product_variant (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES product(id),
    img_product_id INT,
    name VARCHAR(255),
    stock INT DEFAULT 0,
    sold INT DEFAULT 0,
    original_price NUMERIC(19,4) NOT NULL,
    discount_amount NUMERIC(19,4) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS img_product (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id),
    image VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS product_description_block (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id),
    sort_order INT,
    content TEXT,
    img_content VARCHAR(255),
    caption_img VARCHAR(255)
);

-- 6. PHÂN HỆ KHUYẾN MÃI (MARKETING)

-- Entity: erp.company.sales.entity.Voucher
CREATE TABLE IF NOT EXISTS voucher (
    id SERIAL PRIMARY KEY,
    discount_type VARCHAR(255), -- Java String: PERCENTAGE / FIXED_AMOUNT
    discount_value NUMERIC(19,4), -- BigDecimal
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Entity: erp.company.sales.entity.VoucherConstraint
CREATE TABLE IF NOT EXISTS voucher_constraint (
    id SERIAL PRIMARY KEY,
    voucher_id INT NOT NULL REFERENCES voucher(id),
    min_order_amount NUMERIC(19,4),
    max_discount_amount NUMERIC(19,4)
);

-- Entity: erp.company.sales.entity.VoucherDetail
CREATE TABLE IF NOT EXISTS voucher_detail (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    voucher_id INT REFERENCES voucher(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- 7. PHÂN HỆ ĐƠN HÀNG & THANH TOÁN (SALES)

CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES "user"(id)
);

CREATE TABLE IF NOT EXISTS cart_item (
    id SERIAL PRIMARY KEY,
    cart_id INT NOT NULL REFERENCES cart(id),
    product_variant_id INT REFERENCES product_variant(id),
    quantity INT DEFAULT 1,
    is_selected BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS payment (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(19,4) NOT NULL,
    payment_status VARCHAR(255), -- PENDING, COMPLETED
    payment_method VARCHAR(255), -- COD, VNPAY, MOMO
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity: erp.company.sales.entity.Order
CREATE TABLE IF NOT EXISTS "order" (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id),
    
    -- Liên kết với Customers CRM
    customer_id UUID REFERENCES customers(id), 

    voucher_detail_id INT REFERENCES voucher_detail(id),
    payment_id INT REFERENCES payment(id),
    
    order_status VARCHAR(255), -- PENDING, SHIPPING, COMPLETED...
    payment_method VARCHAR(255),
    shipping_address VARCHAR(255),
    
    -- totalAmount bị comment trong Java Entity nên không tạo cột
    -- total_amount NUMERIC(19,4), 
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Entity: erp.company.sales.entity.OrderDetail
CREATE TABLE IF NOT EXISTS order_detail (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES "order"(id),
    product_variant_id INT REFERENCES product_variant(id),
    quantity INT NOT NULL,
    price NUMERIC(19,4) NOT NULL -- BigDecimal
);

-- 8. PHÂN HỆ ĐÁNH GIÁ (REVIEW)

CREATE TABLE IF NOT EXISTS review (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id),
    user_id INT REFERENCES "user"(id),
    content TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS img_review (
    id SERIAL PRIMARY KEY,
    review_id INT NOT NULL REFERENCES review(id),
    image VARCHAR(255)
);

-- =======================================================================================
-- 9. DỮ LIỆU DEMO (DATA SEEDING)
-- =======================================================================================

-- 9.1. Roles & Users
INSERT INTO role (role_name) VALUES ('ADMIN'), ('STAFF'), ('CUSTOMER');

INSERT INTO "user" (role_id, username, email, phone, password) VALUES 
(1, 'admin', 'admin@erp.com', '0900000000', 'hashed_password_123'),
(2, 'staff_sales', 'sales@erp.com', '0900000001', 'hashed_password_123');

-- 9.2. Customers
INSERT INTO customers (code, full_name, email, phone, address, status) VALUES
('KH001', 'Nguyễn Văn A', 'nguyenvana@gmail.com', '0912345678', '123 Đường Láng, Hà Nội', 'ACTIVE'),
('KH002', 'Trần Thị B', 'tranthib@gmail.com', '0987654321', '456 Lê Lợi, TP.HCM', 'ACTIVE'),
('KH003', 'Phạm Văn C', 'phamvanc@gmail.com', '0901112222', '789 Nguyễn Trãi, Đà Nẵng', 'INACTIVE');

-- 9.3. Catalog Data
INSERT INTO unit (symbol) VALUES ('Cái'), ('Hộp'), ('Combo');
INSERT INTO brand (name, slug) VALUES ('Samsung', 'samsung'), ('Apple', 'apple'), ('Nike', 'nike');
INSERT INTO category (name, slug) VALUES ('Điện thoại', 'dien-thoai'), ('Thời trang', 'thoi-trang');

INSERT INTO cate_brand_link (brand_id, category_id) VALUES (1, 1), (2, 1), (3, 2);

-- Sản phẩm 1: iPhone 15
INSERT INTO product (cate_brand_link_id, name, total_stock, description) VALUES 
(2, 'iPhone 15 Pro Max', 100, 'Điện thoại cao cấp nhất 2024');

-- Biến thể iPhone
INSERT INTO product_variant (product_id, name, stock, original_price) VALUES 
(1, 'iPhone 15 Pro Max - 256GB - Titan Tự Nhiên', 50, 34000000),
(1, 'iPhone 15 Pro Max - 512GB - Titan Xanh', 50, 40000000);

-- 9.4. Voucher Data
INSERT INTO voucher (discount_type, discount_value, is_active) VALUES ('FIXED_AMOUNT', 50000, TRUE);
INSERT INTO voucher_detail (code, voucher_id) VALUES ('WELCOME50', 1);
INSERT INTO voucher_constraint (voucher_id, min_order_amount, max_discount_amount) VALUES (1, 200000, NULL);

INSERT INTO voucher (discount_type, discount_value, is_active) VALUES ('PERCENTAGE', 10, TRUE);
INSERT INTO voucher_detail (code, voucher_id) VALUES ('SALE10', 2);
INSERT INTO voucher_constraint (voucher_id, min_order_amount, max_discount_amount) VALUES (2, 0, 100000);

-- 9.5. Orders Data
-- Đơn hàng 1: KH001 mua iPhone
-- [Lưu ý] Đã bỏ cột total_amount vì entity không map
INSERT INTO "order" (customer_id, order_status, payment_method, shipping_address)
VALUES 
((SELECT id FROM customers WHERE code = 'KH001'), 'PENDING', 'COD', '123 Đường Láng, Hà Nội');

INSERT INTO order_detail (order_id, product_variant_id, quantity, price) VALUES 
(1, 1, 1, 34000000);

-- Đơn hàng 2: KH002 mua iPhone (Đã hoàn thành)
INSERT INTO "order" (customer_id, order_status, payment_method, shipping_address)
VALUES 
((SELECT id FROM customers WHERE code = 'KH002'), 'COMPLETED', 'MOMO', '456 Lê Lợi, TP.HCM');

INSERT INTO order_detail (order_id, product_variant_id, quantity, price) VALUES 
(2, 2, 1, 40000000);