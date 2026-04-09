-- 1. TẠO CÁC KIỂU DỮ LIỆU ENUM (Dựa trên ngữ cảnh phổ biến vì ERD không liệt kê chi tiết giá trị)
DO $$
BEGIN
    -- Role cho User
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
        CREATE TYPE role_enum AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');
    END IF;
    -- Loại giảm giá (dựa trên voucher)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type_enum') THEN
        CREATE TYPE discount_type_enum AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'SHIPPING');
    END IF;
    -- Trạng thái đơn hàng (dùng chung nếu cần chuẩn hóa, trong ERD để VARCHAR)
    -- Ở đây mình giữ VARCHAR theo ERD nhưng bạn có thể đổi thành ENUM nếu muốn cứng nhắc hơn.
END$$;

-- 2. PHÂN HỆ NGƯỜI DÙNG & PHÂN QUYỀN (AUTH)

-- Bảng Vai trò
CREATE TABLE IF NOT EXISTS role (
    id SERIAL PRIMARY KEY,
    role_name role_enum NOT NULL DEFAULT 'CUSTOMER'
);

-- Bảng Người dùng
CREATE TABLE IF NOT EXISTS "user" ( -- "user" là từ khóa trong PG, cần ngoặc kép
    id SERIAL PRIMARY KEY,
    role_id INT REFERENCES role(id),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Địa chỉ giao hàng
CREATE TABLE IF NOT EXISTS address (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES "user"(id),
    city VARCHAR(255),
    district VARCHAR(255),
    ward VARCHAR(255),
    street_address VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE -- TINYINT(1) -> BOOLEAN
);

-- 3. PHÂN HỆ TIN TỨC (NEWS / CMS)

-- Bảng Tin tức
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    author_id INT REFERENCES "user"(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    thumbnail VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Nội dung chi tiết tin tức (Block content)
CREATE TABLE IF NOT EXISTS content_block (
    id SERIAL PRIMARY KEY,
    news_id INT NOT NULL REFERENCES news(id),
    sort_order INT DEFAULT 0,
    content TEXT,
    img_content VARCHAR(255),
    caption_img VARCHAR(255)
);

-- 4. PHÂN HỆ DANH MỤC SẢN PHẨM (CATALOG)

-- Đơn vị tính
CREATE TABLE IF NOT EXISTS unit (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(25) NOT NULL -- Ví dụ: kg, pcs, box
);

-- Thương hiệu
CREATE TABLE IF NOT EXISTS brand (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    logo VARCHAR(255)
);

-- Danh mục sản phẩm (Đệ quy)
CREATE TABLE IF NOT EXISTS category (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES category(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    icon_emoji VARCHAR(100)
);

-- Thuộc tính (Màu sắc, Kích thước...)
CREATE TABLE IF NOT EXISTS attribute (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit_id INT REFERENCES unit(id)
);

-- Liên kết Danh mục - Thương hiệu (N-N)
CREATE TABLE IF NOT EXISTS cate_brand_link (
    id SERIAL PRIMARY KEY,
    brand_id INT REFERENCES brand(id),
    category_id INT REFERENCES category(id),
    UNIQUE(brand_id, category_id)
);

-- Liên kết Danh mục - Thuộc tính (N-N)
CREATE TABLE IF NOT EXISTS cate_attribute_link (
    id SERIAL PRIMARY KEY,
    attribute_id INT REFERENCES attribute(id),
    category_id INT REFERENCES category(id)
);

-- 5. PHÂN HỆ SẢN PHẨM (PRODUCT)

-- Sản phẩm chung
CREATE TABLE IF NOT EXISTS product (
    id SERIAL PRIMARY KEY,
    cate_brand_link_id INT REFERENCES cate_brand_link(id),
    name VARCHAR(255) NOT NULL,
    avg_rating DECIMAL(2,1) DEFAULT 0,
    total_sold INT DEFAULT 0,
    total_stock INT DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Giá trị thuộc tính của sản phẩm
CREATE TABLE IF NOT EXISTS product_attribute_value (
    id SERIAL PRIMARY KEY, -- ERD không vẽ ID riêng nhưng nên có
    product_id INT REFERENCES product(id),
    attribute_id INT REFERENCES attribute(id),
    value VARCHAR(255) NOT NULL -- Ví dụ: "Đỏ", "XL", "Cotton"
);

-- Biến thể sản phẩm (SKU cụ thể để bán)
CREATE TABLE IF NOT EXISTS product_variant (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES product(id),
    img_product_id INT, -- Có thể tham chiếu đến bảng ảnh
    name VARCHAR(255), -- Tên đầy đủ variant (VD: Áo Thun - Đỏ - XL)
    stock INT DEFAULT 0,
    sold INT DEFAULT 0,
    original_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0
);

-- Ảnh sản phẩm
CREATE TABLE IF NOT EXISTS img_product (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id),
    image VARCHAR(255) NOT NULL
);

-- Mô tả chi tiết sản phẩm (Dạng block giống tin tức)
CREATE TABLE IF NOT EXISTS product_description_block (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id),
    sort_order INT,
    content TEXT,
    img_content VARCHAR(255),
    caption_img VARCHAR(255)
);

-- 6. PHÂN HỆ KHUYẾN MÃI (MARKETING)

-- Mã giảm giá
CREATE TABLE IF NOT EXISTS voucher (
    id SERIAL PRIMARY KEY,
    discount_type VARCHAR(255), -- Có thể dùng ENUM đã tạo ở trên
    discount_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE
);

-- Điều kiện áp dụng Voucher
CREATE TABLE IF NOT EXISTS voucher_constraint (
    id SERIAL PRIMARY KEY,
    voucher_id INT NOT NULL REFERENCES voucher(id),
    min_order_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2)
);

-- Chi tiết Voucher (User nào sở hữu mã nào - nếu cần)
CREATE TABLE IF NOT EXISTS voucher_detail (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    voucher_id INT REFERENCES voucher(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- 7. PHÂN HỆ ĐƠN HÀNG & THANH TOÁN (SALES)

-- Giỏ hàng
CREATE TABLE IF NOT EXISTS cart (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES "user"(id) -- Mỗi user 1 giỏ hàng
);

-- Chi tiết giỏ hàng
CREATE TABLE IF NOT EXISTS cart_item (
    id SERIAL PRIMARY KEY,
    cart_id INT NOT NULL REFERENCES cart(id),
    product_variant_id INT REFERENCES product_variant(id),
    quantity INT DEFAULT 1,
    is_selected BOOLEAN DEFAULT TRUE -- Chọn để thanh toán
);

-- Thanh toán
CREATE TABLE IF NOT EXISTS payment (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(255), -- PENDING, COMPLETED, FAILED
    payment_method VARCHAR(255), -- COD, VNPAY, MOMO
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Đơn hàng
CREATE TABLE IF NOT EXISTS "order" ( -- "order" là từ khóa, cần ngoặc kép
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES "user"(id),
    voucher_detail_id INT REFERENCES voucher_detail(id),
    payment_id INT REFERENCES payment(id), -- Liên kết thanh toán
    order_status VARCHAR(255) DEFAULT 'PENDING',
    payment_method VARCHAR(255), -- Lưu redundancy để query nhanh
    shipping_address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chi tiết đơn hàng
CREATE TABLE IF NOT EXISTS order_detail (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES "order"(id),
    product_variant_id INT REFERENCES product_variant(id),
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL -- Giá tại thời điểm mua
);

-- 8. PHÂN HỆ ĐÁNH GIÁ (REVIEW)

-- Đánh giá sản phẩm
CREATE TABLE IF NOT EXISTS review (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id),
    user_id INT REFERENCES "user"(id),
    content TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ảnh đánh giá
CREATE TABLE IF NOT EXISTS img_review (
    id SERIAL PRIMARY KEY,
    review_id INT NOT NULL REFERENCES review(id),
    image VARCHAR(255)
);