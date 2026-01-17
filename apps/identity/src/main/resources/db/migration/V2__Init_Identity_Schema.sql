-- Database: identity

-- DROP DATABASE IF EXISTS identity;

-- CREATE DATABASE identity
--	WITH
--	OWNER = postgres
--	ENCODING = 'UTF8'
--	LC_COLLATE = 'Vietnamese_Vietnam.1258'
--	LC_CTYPE = 'Vietnamese_Vietnam.1258'
--	LOCALE_PROVIDER = 'libc'
--	TABLESPACE = pg_default
--	CONNECTION LIMIT = -1
--	IS_TEMPLATE = False;

-- 1. Bảng permissions
CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY, -- Sửa SERIAL -> BIGSERIAL
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- 2. Bảng roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY, -- Sửa SERIAL -> BIGSERIAL
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- 3. Bảng role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT REFERENCES roles (id),       -- Sửa INT -> BIGINT
    permission_id BIGINT REFERENCES permissions (id), -- Sửa INT -> BIGINT
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Bảng User (Identity chính)
-- Lưu ý: Identity không nên lưu "phòng ban" hay "chức vụ" chi tiết,
-- nó chỉ cần biết user này là ai, role gì để cấp Token.
-- Dữ liệu phòng ban sẽ được đẩy sang HRM Service qua Event/API khi tạo user.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, LOCKED, INACTIVE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,

-- Phân loại user
account_type VARCHAR(20) NOT NULL, -- 'INTERNAL' (Staff) hoặc 'EXTERNAL' (Customer)

-- Role chính (Access Control)
role_id BIGINT REFERENCES roles(id) );

-- 5. Bảng Refresh Token (Quản lý phiên đăng nhập)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID REFERENCES users (id),
    token VARCHAR(255) NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 1. THÊM DANH SÁCH ROLE (Dựa trên RoleConstant.java)
-- =============================================================================
INSERT INTO roles (name, description) VALUES
('ADMIN', 'Quản trị hệ thống - Toàn quyền'),
('EMPLOYEE', 'Nhân viên cơ bản (Nội bộ)'),
('DEPT_MANAGER', 'Quản lý phòng ban'),
('HR_MANAGER', 'Quản lý nhân sự'),
('PURCHASING_MANAGER', 'Quản lý mua sắm'),
('STOREKEEPER', 'Thủ kho'),
('CUSTOMER', 'Khách hàng (Bên ngoài)'),
('SALES_ADMIN', 'Quản trị bán hàng'),
('CFO', 'Kế toán trưởng'),
('RECEIVABLE_ACC', 'Kế toán công nợ phải thu'),
('PAYABLE_ACC', 'Kế toán công nợ phải trả'),
('PAYROLL_ACC', 'Kế toán tiền lương')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 2. THÊM DANH SÁCH PERMISSION (Dựa trên PermissionsConstant.java)
-- =============================================================================
INSERT INTO permissions (code, description) VALUES
-- HRM
('HRM_ACCOUNT_VIEW', 'Xem tài khoản HRM'), ('HRM_ACCOUNT_CREATE', 'Tạo tài khoản HRM'), 
('HRM_ACCOUNT_UPDATE', 'Cập nhật tài khoản HRM'), ('HRM_ACCOUNT_DELETE', 'Xóa tài khoản HRM'),
('HRM_BENEFIT_VIEW', 'Xem phúc lợi'), ('HRM_BENEFIT_CREATE', 'Tạo phúc lợi'), 
('HRM_BENEFIT_UPDATE', 'Cập nhật phúc lợi'), ('HRM_BENEFIT_DELETE', 'Xóa phúc lợi'),
('HRM_CONTRACT_VIEW', 'Xem hợp đồng'), ('HRM_CONTRACT_CREATE', 'Tạo hợp đồng'), 
('HRM_CONTRACT_UPDATE', 'Cập nhật hợp đồng'), ('HRM_CONTRACT_DELETE', 'Xóa hợp đồng'),
('HRM_REPORT_VIEW', 'Xem báo cáo nhân sự'), ('HRM_REPORT_EXPORT', 'Xuất báo cáo nhân sự'),
('HRM_LEAVE_VIEW', 'Xem nghỉ phép'), ('HRM_LEAVE_CREATE', 'Tạo yêu cầu nghỉ phép'), 
('HRM_LEAVE_APPROVE', 'Duyệt nghỉ phép'), ('HRM_LEAVE_REJECT', 'Từ chối nghỉ phép'), ('HRM_LEAVE_DELETE', 'Xóa nghỉ phép'),
('HRM_DEPARTMENT_VIEW', 'Xem phòng ban'), ('HRM_DEPARTMENT_CREATE', 'Tạo phòng ban'), 
('HRM_DEPARTMENT_UPDATE', 'Cập nhật phòng ban'), ('HRM_DEPARTMENT_DELETE', 'Xóa phòng ban'),
('HRM_EMPLOYEE_VIEW', 'Xem thông tin nhân viên'), ('HRM_EMPLOYEE_CREATE', 'Tạo nhân viên'), 
('HRM_EMPLOYEE_UPDATE', 'Cập nhật nhân viên'), ('HRM_EMPLOYEE_DELETE', 'Xóa nhân viên'),
('HRM_SALARY_INFO_VIEW', 'Xem thông tin lương'), ('HRM_SALARY_INFO_CREATE', 'Tạo thông tin lương'), 
('HRM_SALARY_INFO_UPDATE', 'Cập nhật thông tin lương'),
('HRM_POSITION_VIEW', 'Xem chức vụ'), ('HRM_POSITION_CREATE', 'Tạo chức vụ'), 
('HRM_POSITION_UPDATE', 'Cập nhật chức vụ'), ('HRM_POSITION_DELETE', 'Xóa chức vụ'),
-- SUPPLY CHAIN (Lưu ý: dùng đúng typo PURCHASE trong code của bạn thêm quản lý nhà cung cấp + báo cáo kho)
('SUPPLYCHAIN_COMPANY_ASSETS_VIEW', 'Xem tài sản công ty'), ('SUPPLYCHAIN_COMPANY_ASSETS_CREATE', 'Tạo tài sản'),
('SUPPLYCHAIN_COMPANY_ASSETS_UPDATE', 'Cập nhật tài sản'), ('SUPPLYCHAIN_COMPANY_ASSETS_DELETE', 'Xóa tài sản'),
('SUPPLYCHAIN_MASTERDATA_VIEW', 'Xem danh mục chính'), ('SUPPLYCHAIN_MASTERDATA_CREATE', 'Tạo danh mục'),
('SUPPLYCHAIN_MASTERDATA_UPDATE', 'Cập nhật danh mục'), ('SUPPLYCHAIN_MASTERDATA_DELETE', 'Xóa danh mục'),
('SUPPLYCHAIN_PURCHASE_REQUISITION_VIEW', 'Xem yêu cầu mua sắm'), ('SUPPLYCHAIN_PURCHASE_REQUISITION_CREATE', 'Tạo yêu cầu mua sắm'),
('SUPPLYCHAIN_PURCHASE_REQUISITION_DELETE', 'Xóa yêu cầu mua sắm'), ('SUPPLYCHAIN_PURCHASE_REQUISITION_CONFIRM', 'Xác nhận yêu cầu'), 
('SUPPLYCHAIN_PURCHASE_REQUISITION_REJECT', 'Từ chối yêu cầu'),
('SUPPLYCHAIN_QUOTATION_SUPPLIER_VIEW', 'Xem báo giá NCC'), ('SUPPLYCHAIN_QUOTATION_SUPPLIER_CREATE', 'Tạo báo giá NCC'),
('SUPPLYCHAIN_QUOTATION_SUPPLIER_UPDATE', 'Cập nhật báo giá NCC'), ('SUPPLYCHAIN_QUOTATION_SUPPLIER_DELETE', 'Xóa báo giá NCC'),
('SUPPLYCHAIN_PURCHASE_ORDER_VIEW', 'Xem đơn mua hàng'), ('SUPPLYCHAIN_PURCHASE_ORDER_CREATE', 'Tạo đơn mua hàng'), 
('SUPPLYCHAIN_PURCHASE_ORDER_CONFIRM', 'Xác nhận đơn mua'), ('SUPPLYCHAIN_PURCHASE_ORDER_REJECT', 'Từ chối đơn mua'), 
('SUPPLYCHAIN_PURCHASE_ORDER_DELETE', 'Xóa đơn mua'), ('SUPPLYCHAIN_PURCHASE_ORDER_UPDATE', 'Cập nhật đơn mua'),
('SUPPLYCHAIN_PURCHASE_RETURN_VIEW', 'Xem hàng mua trả lại'), ('SUPPLYCHAIN_PURCHASE_RETURN_CREATE', 'Tạo hàng mua trả lại'),
('SUPPLYCHAIN_PURCHASE_RETURN_UPDATE', 'Cập nhật hàng mua trả lại'), ('SUPPLYCHAIN_PURCHASE_RETURN_DELETE', 'Xóa hàng mua trả lại'),
('SUPPLYCHAIN_GOODS_RECEIPTS_VIEW', 'Xem nhập kho'), ('SUPPLYCHAIN_GOODS_RECEIPTS_CONFIRM', 'Xác nhận nhập kho'), 
('SUPPLYCHAIN_GOODS_RECEIPTS_UPDATE', 'Cập nhật nhập kho'),
('SUPPLYCHAIN_GOODS_ISSUE_VIEW', 'Xem xuất kho'), ('SUPPLYCHAIN_GOODS_ISSUE_REQUEST', 'Yêu cầu xuất kho'), 
('SUPPLYCHAIN_GOODS_ISSUE_CONFIRM', 'Xác nhận xuất kho'), ('SUPPLYCHAIN_GOODS_ISSUE_CREATE', 'Tạo phiếu xuất'), ('SUPPLYCHAIN_GOODS_ISSUE_DELETE', 'Xóa phiếu xuất'),
('SUPPLYCHAIN_INVENTORY_CONTROL_VIEW', 'Kiểm soát tồn kho'),
('SUPPLYCHAIN_STOCK_TAKE_VIEW', 'Kiểm kê kho'), ('SUPPLYCHAIN_STOCK_TAKE_CREATE', 'Tạo kiểm kê'),
('SUPPLYCHAIN_STOCK_TAKE_UPDATE', 'Cập nhật kiểm kê'), ('SUPPLYCHAIN_STOCK_TAKE_DELETE', 'Xóa kiểm kê'),
('SUPPLYCHAIN_SUPPLIER_VIEW', 'Xem nhà cung cấp'), ('SUPPLYCHAIN_SUPPLIER_CREATE', 'Tạo nhà cung cấp'),
('SUPPLYCHAIN_SUPPLIER_UPDATE', 'Cập nhật nhà cung cấp'), ('SUPPLYCHAIN_SUPPLIER_DELETE', 'Xóa nhà cung cấp'),
('SUPPLYCHAIN_REPORT_VIEW', 'Xem báo cáo kho'), ('SUPPLYCHAIN_REPORT_EXPORT', 'Xuất báo cáo kho'),
-- SALES
('SALES_CUSTOMER_VIEW', 'Xem khách hàng'), ('SALES_CUSTOMER_UPDATE', 'Cập nhật khách hàng'),
('SALES_ORDER_MANAGEMENT_VIEW', 'Quản lý đơn hàng'), ('SALES_POS_ORDER_CREATE', 'Tạo đơn POS'),
('SALES_ORDER_CONFIRM', 'Xác nhận đơn hàng'), ('SALES_ORDER_CANCEL', 'Hủy đơn hàng'), ('SALES_ORDER_MANAGEMENT_DELETE', 'Xóa đơn hàng'),
('SALES_VOUCHER_VIEW', 'Xem voucher'), ('SALES_VOUCHER_CREATE', 'Tạo voucher'), 
('SALES_VOUCHER_UPDATE', 'Cập nhật voucher'), ('SALES_VOUCHER_DELETE', 'Xóa voucher'),
('SALES_PAYMENT_RECORDING_CONFIRM', 'Xác nhận thanh toán'),
('SALES_REPORT_VIEW', 'Xem báo cáo bán hàng'), ('SALES_REPORT_EXPORT', 'Xuất báo cáo bán hàng'),
-- ACCOUNTING
('ACCOUNTING_CHART_OF_ACCOUNTS_VIEW', 'Xem hệ thống tài khoản'), ('ACCOUNTING_CHART_OF_ACCOUNTS_CREATE', 'Tạo tài khoản'),
('ACCOUNTING_CHART_OF_ACCOUNTS_UPDATE', 'Cập nhật tài khoản'), ('ACCOUNTING_CHART_OF_ACCOUNTS_DELETE', 'Xóa tài khoản'),
('ACCOUNTING_SETUP_AUTOMATIC_VIEW', 'Xem thiết lập tự động'), ('ACCOUNTING_SETUP_AUTOMATIC_CREATE', 'Tạo thiết lập tự động'),
('ACCOUNTING_SETUP_AUTOMATIC_UPDATE', 'Cập nhật thiết lập tự động'), ('ACCOUNTING_SETUP_AUTOMATIC_DELETE', 'Xóa thiết lập tự động'),
('ACCOUNTING_JOURNAL_ENTRY_VIEW', 'Xem bút toán'), ('ACCOUNTING_JOURNAL_ENTRY_CREATE', 'Tạo bút toán'),
('ACCOUNTING_JOURNAL_ENTRY_UPDATE', 'Cập nhật bút toán'), ('ACCOUNTING_JOURNAL_ENTRY_DELETE', 'Xóa bút toán'),
('ACCOUNTING_PERIOD_CLOSING_APPROVE', 'Duyệt khóa sổ'), ('ACCOUNTING_CASHFLOW_VIEW', 'Xem dòng tiền'),
('ACCOUNTING_REPORT_EXPORT', 'Xuất báo cáo tài chính'),
('ACCOUNTING_PAYMENT_VIEW', 'Xem phiếu chi'), ('ACCOUNTING_PAYMENT_CREATE', 'Tạo phiếu chi'),
('ACCOUNTING_PAYMENT_UPDATE', 'Cập nhật phiếu chi'), ('ACCOUNTING_PAYMENT_DELETE', 'Xóa phiếu chi'),
('ACCOUNTING_RECEIPT_VIEW', 'Xem phiếu thu'), ('ACCOUNTING_RECEIPT_CREATE', 'Tạo phiếu thu'),
('ACCOUNTING_RECEIPT_UPDATE', 'Cập nhật phiếu thu'), ('ACCOUNTING_RECEIPT_DELETE', 'Xóa phiếu thu'),
('ACCOUNTING_PAYROLL_VIEW', 'Xem bảng lương kế toán'), ('ACCOUNTING_PAYROLL_CREATE', 'Tạo bảng lương'),
('ACCOUNTING_PAYROLL_UPDATE', 'Cập nhật bảng lương'), ('ACCOUNTING_PAYROLL_DELETE', 'Xóa bảng lương')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 3. ÁNH XẠ ROLE_PERMISSIONS (Dựa trên Role_Permission.xlsx)
-- =============================================================================

-- 3.1 Gán quyền cho EMPLOYEE (Quyền cơ sở cho các Role nội bộ) 
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'EMPLOYEE' AND p.code IN (
    'HRM_ACCOUNT_VIEW', 'HRM_ACCOUNT_UPDATE', 'HRM_BENEFIT_VIEW', 'HRM_CONTRACT_VIEW', 
    'HRM_LEAVE_VIEW', 'HRM_LEAVE_CREATE', 'HRM_LEAVE_DELETE', 
    'SUPPLYCHAIN_COMPANY_ASSETS_VIEW', 'ACCOUNTING_PAYROLL_VIEW'
) ON CONFLICT DO NOTHING;

-- 3.2 Gán quyền cho DEPT_MANAGER (EMPLOYEE + HRM/SC thêm) 
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'DEPT_MANAGER'), permission_id 
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'DEPT_MANAGER' AND p.code IN (
    'HRM_ACCOUNT_CREATE', 'HRM_ACCOUNT_DELETE', 'HRM_BENEFIT_CREATE', 'HRM_BENEFIT_UPDATE', 
    'HRM_BENEFIT_DELETE', 'HRM_CONTRACT_CREATE', 'HRM_CONTRACT_UPDATE', 'HRM_CONTRACT_DELETE', 
    'HRM_REPORT_VIEW', 'HRM_REPORT_EXPORT', 'HRM_LEAVE_APPROVE', 'HRM_LEAVE_REJECT', 
    'HRM_EMPLOYEE_VIEW', 'HRM_EMPLOYEE_CREATE', 'HRM_EMPLOYEE_UPDATE', 'HRM_EMPLOYEE_DELETE', 
    'HRM_SALARY_INFO_VIEW', 'HRM_SALARY_INFO_CREATE', 'HRM_SALARY_INFO_UPDATE',
    'SUPPLYCHAIN_PURCHASE_REQUISITION_VIEW', 'SUPPLYCHAIN_PURCHASE_REQUISITION_CREATE', 'SUPPLYCHAIN_PURCHASE_REQUISITION_DELETE'
) ON CONFLICT DO NOTHING;

-- 3.3 Gán quyền cho HR_MANAGER (DEPT_MANAGER + HRM nâng cao) 
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'HR_MANAGER'), permission_id 
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'DEPT_MANAGER')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'HR_MANAGER' AND p.code IN (
    'HRM_DEPARTMENT_VIEW', 'HRM_DEPARTMENT_CREATE', 'HRM_DEPARTMENT_UPDATE', 'HRM_DEPARTMENT_DELETE', 
    'HRM_POSITION_VIEW', 'HRM_POSITION_CREATE', 'HRM_POSITION_UPDATE', 'HRM_POSITION_DELETE'
) ON CONFLICT DO NOTHING;

-- 3.4 Gán quyền cho STOREKEEPER (EMPLOYEE + Kho) 
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'STOREKEEPER'), permission_id 
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'STOREKEEPER' AND p.code IN (
    'SUPPLYCHAIN_GOODS_RECEIPTS_VIEW', 'SUPPLYCHAIN_GOODS_RECEIPTS_CONFIRM', 'SUPPLYCHAIN_GOODS_RECEIPTS_UPDATE', 
    'SUPPLYCHAIN_GOODS_ISSUE_VIEW', 'SUPPLYCHAIN_GOODS_ISSUE_CONFIRM', 'SUPPLYCHAIN_GOODS_ISSUE_CREATE', 
    'SUPPLYCHAIN_GOODS_ISSUE_DELETE', 'SUPPLYCHAIN_INVENTORY_CONTROL_VIEW', 'SUPPLYCHAIN_STOCK_TAKE_VIEW', 
    'SUPPLYCHAIN_STOCK_TAKE_CREATE', 'SUPPLYCHAIN_STOCK_TAKE_UPDATE', 'SUPPLYCHAIN_STOCK_TAKE_DELETE',
    'SUPPLYCHAIN_REPORT_VIEW', 'SUPPLYCHAIN_REPORT_EXPORT'
) ON CONFLICT DO NOTHING;

-- 3.5 Gán quyền cho CFO (EMPLOYEE + Kế toán tổng hợp) 
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'CFO'), permission_id 
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'CFO' AND p.code IN (
    'ACCOUNTING_CHART_OF_ACCOUNTS_VIEW', 'ACCOUNTING_CHART_OF_ACCOUNTS_CREATE', 'ACCOUNTING_CHART_OF_ACCOUNTS_UPDATE', 
    'ACCOUNTING_CHART_OF_ACCOUNTS_DELETE', 'ACCOUNTING_JOURNAL_ENTRY_VIEW', 'ACCOUNTING_JOURNAL_ENTRY_CREATE', 
    'ACCOUNTING_JOURNAL_ENTRY_UPDATE', 'ACCOUNTING_JOURNAL_ENTRY_DELETE', 'ACCOUNTING_PERIOD_CLOSING_APPROVE', 
    'ACCOUNTING_CASHFLOW_VIEW', 'ACCOUNTING_REPORT_EXPORT', 'ACCOUNTING_SETUP_AUTOMATIC_VIEW', 'ACCOUNTING_SETUP_AUTOMATIC_CREATE', 
    'ACCOUNTING_SETUP_AUTOMATIC_UPDATE', 'ACCOUNTING_SETUP_AUTOMATIC_DELETE'
) ON CONFLICT DO NOTHING;

-- 3.6 Gán quyền cho ADMIN (Full tất cả permissions) 
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions
ON CONFLICT DO NOTHING;

-- =============================================================================
-- TIẾP TỤC: GÁN QUYỀN CHO CÁC ROLE CÒN LẠI
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PURCHASING_MANAGER (Quản lý mua sắm)
-- Logic: Quyền EMPLOYEE + Các quyền Supply Chain (Mua hàng, Báo giá, Trả hàng...)
-- -----------------------------------------------------------------------------
-- Bước 1: Kế thừa quyền EMPLOYEE
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'PURCHASING_MANAGER'), permission_id 
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

-- Bước 2: Thêm quyền đặc thù Supply Chain
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'PURCHASING_MANAGER' AND p.code IN (
    'SUPPLYCHAIN_COMPANY_ASSETS_VIEW', 'SUPPLYCHAIN_COMPANY_ASSETS_CREATE', 
    'SUPPLYCHAIN_COMPANY_ASSETS_UPDATE', 'SUPPLYCHAIN_COMPANY_ASSETS_DELETE',
    'SUPPLYCHAIN_MASTERDATA_VIEW', 'SUPPLYCHAIN_MASTERDATA_CREATE', 
    'SUPPLYCHAIN_MASTERDATA_UPDATE', 'SUPPLYCHAIN_MASTERDATA_DELETE',
    'SUPPLYCHAIN_PURCHASE_REQUISITION_VIEW', 'SUPPLYCHAIN_PURCHASE_REQUISITION_CONFIRM', 
    'SUPPLYCHAIN_PURCHASE_REQUISITION_REJECT',
    'SUPPLYCHAIN_QUOTATION_SUPPLIER_VIEW', 'SUPPLYCHAIN_QUOTATION_SUPPLIER_CREATE', 
    'SUPPLYCHAIN_QUOTATION_SUPPLIER_UPDATE', 'SUPPLYCHAIN_QUOTATION_SUPPLIER_DELETE',
    'SUPPLYCHAIN_PURCHASE_ORDER_VIEW', 'SUPPLYCHAIN_PURCHASE_ORDER_CREATE', 
    'SUPPLYCHAIN_PURCHASE_ORDER_UPDATE', 'SUPPLYCHAIN_PURCHASE_ORDER_DELETE',
    'SUPPLYCHAIN_PURCHASE_RETURN_VIEW', 'SUPPLYCHAIN_PURCHASE_RETURN_CREATE', 
    'SUPPLYCHAIN_PURCHASE_RETURN_UPDATE', 'SUPPLYCHAIN_PURCHASE_RETURN_DELETE',
    'SUPPLYCHAIN_SUPPLIER_VIEW', 'SUPPLYCHAIN_SUPPLIER_CREATE', 
    'SUPPLYCHAIN_SUPPLIER_UPDATE', 'SUPPLYCHAIN_SUPPLIER_DELETE'
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. SALES_ADMIN (Quản trị bán hàng)
-- Logic: Quyền EMPLOYEE + Sales CRM + Yêu cầu xuất kho (Supply Chain)
-- -----------------------------------------------------------------------------
-- Bước 1: Kế thừa quyền EMPLOYEE
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'SALES_ADMIN'), permission_id 
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

-- Bước 2: Thêm quyền Sales và Supply Chain liên quan
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SALES_ADMIN' AND p.code IN (
    -- Từ cột Supply Chain
    'SUPPLYCHAIN_GOODS_ISSUE_REQUEST',
    -- Từ cột Sale & CRM
    'SALES_CUSTOMER_VIEW', 'SALES_CUSTOMER_UPDATE',
    'SALES_ORDER_MANAGEMENT_VIEW', 'SALES_POS_ORDER_CREATE',
    'SALES_ORDER_CONFIRM', 'SALES_ORDER_CANCEL', 'SALES_ORDER_MANAGEMENT_DELETE',
    'SALES_VOUCHER_VIEW', 'SALES_VOUCHER_CREATE', 
    'SALES_VOUCHER_UPDATE', 'SALES_VOUCHER_DELETE',
    'SALES_PAYMENT_RECORDING_CONFIRM',
    'SALES_REPORT_VIEW', 'SALES_REPORT_EXPORT'
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. RECEIVABLE_ACC (Kế toán phải thu)
-- Logic: Quyền EMPLOYEE + Phiếu thu + Xác nhận đơn mua (Supply Chain)
-- -----------------------------------------------------------------------------
-- Bước 1: Kế thừa quyền EMPLOYEE
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'RECEIVABLE_ACC'), permission_id 
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

-- Bước 2: Thêm quyền Kế toán thu và PO Confirm
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'RECEIVABLE_ACC' AND p.code IN (
    -- Từ cột Supply Chain
    'SUPPLYCHAIN_PURCHASE_ORDER_CONFIRM', 'SUPPLYCHAIN_PURCHASE_ORDER_REJECT', -- đẩy lên kế toán trưởng
    -- Từ cột Finance
    'ACCOUNTING_RECEIPT_VIEW', 'ACCOUNTING_RECEIPT_CREATE', 
    'ACCOUNTING_RECEIPT_UPDATE', 'ACCOUNTING_RECEIPT_DELETE'
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. PAYABLE_ACC (Kế toán phải trả)
-- Logic: Quyền EMPLOYEE + Phiếu chi (Payment)
-- -----------------------------------------------------------------------------
-- Bước 1: Kế thừa quyền EMPLOYEE
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'PAYABLE_ACC'), permission_id 
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

-- Bước 2: Thêm quyền Kế toán chi
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'PAYABLE_ACC' AND p.code IN (
    'ACCOUNTING_PAYMENT_VIEW', 'ACCOUNTING_PAYMENT_CREATE', 
    'ACCOUNTING_PAYMENT_UPDATE', 'ACCOUNTING_PAYMENT_DELETE'
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. PAYROLL_ACC (Kế toán lương)
-- Logic: Quyền EMPLOYEE + Bảng lương (Payroll)
-- -----------------------------------------------------------------------------
-- Bước 1: Kế thừa quyền EMPLOYEE
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'PAYROLL_ACC'), permission_id 
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

-- Bước 2: Thêm quyền Lương
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'PAYROLL_ACC' AND p.code IN (
    'ACCOUNTING_PAYROLL_VIEW', 'ACCOUNTING_PAYROLL_CREATE', 
    'ACCOUNTING_PAYROLL_UPDATE', 'ACCOUNTING_PAYROLL_DELETE'
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. GHI CHÚ VỀ ROLE CUSTOMER
-- Theo file Excel: "Accoutype = EXTERNAL không được quyền truy cập portal nhưng có full quyền store"
-- Do đó, trong hệ thống ERP (Portal), role CUSTOMER sẽ không được gán các permission quản trị.
-- Hệ thống Storefront (nếu có) sẽ xử lý quyền riêng hoặc dùng API riêng.
-- -----------------------------------------------------------------------------

INSERT INTO users (
    id, 
    email, 
    password_hash, 
    status, 
    account_type, 
    role_id, 
    created_at, 
    last_login_at
) VALUES 
(
    '8c67022a-1fa1-46ab-835b-30d4aaba08ee',
    'admin@ldg.company', 
    '$2a$10$zhyFs9H01KRGXxSzJC9QpeYXWzRiljmu6b49Xudc2uRkA03TJpmvS',
    'ACTIVE', 
    'INTERNAL', 
    (SELECT id FROM roles WHERE name = 'ADMIN'),
    '2025-01-01 08:00:00', 
    NOW()
)