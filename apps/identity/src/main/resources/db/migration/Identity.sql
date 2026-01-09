-- Database: identity

-- DROP DATABASE IF EXISTS identity;

CREATE DATABASE identity
	WITH
	OWNER = postgres
	ENCODING = 'UTF8'
	LC_COLLATE = 'Vietnamese_Vietnam.1258'
	LC_CTYPE = 'Vietnamese_Vietnam.1258'
	LOCALE_PROVIDER = 'libc'
	TABLESPACE = pg_default
	CONNECTION LIMIT = -1
	IS_TEMPLATE = False;

-- 1. Bảng chứa các quyền hạn (Từ file Excel)
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- Vd: HRM_READ, FINANCE_EXPORT
    description TEXT
);

-- 2. Bảng chứa Role (Admin, HR Manager, Employee...)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- Vd: ADMIN, HR_MANAGER, CUSTOMER
    description TEXT
);

-- 3. Bảng trung gian Role - Permission (RBAC)
CREATE TABLE role_permissions (
    role_id INT REFERENCES roles(id),
    permission_id INT REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Bảng User (Identity chính)
-- Lưu ý: Identity không nên lưu "phòng ban" hay "chức vụ" chi tiết, 
-- nó chỉ cần biết user này là ai, role gì để cấp Token. 
-- Dữ liệu phòng ban sẽ được đẩy sang HRM Service qua Event/API khi tạo user.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, LOCKED, INACTIVE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    
    -- Phân loại user
    account_type VARCHAR(20) NOT NULL, -- 'INTERNAL' (Staff) hoặc 'EXTERNAL' (Customer)
    
    -- Role chính (Access Control)
    role_id INT REFERENCES roles(id)
);

-- 5. Bảng Refresh Token (Quản lý phiên đăng nhập)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);