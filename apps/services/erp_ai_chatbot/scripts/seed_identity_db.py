# seed_identity_db.py
# pip install sqlalchemy psycopg2-binary

from __future__ import annotations

from sqlalchemy import create_engine


IDENTITY_DB = "postgresql+psycopg2://postgres:giap2004@localhost:5432/identity_db"


SQL_SCRIPT = r"""
-- Enable gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Bảng chứa các quyền hạn (Từ file Excel)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- Vd: HRM_READ, FINANCE_EXPORT
    description TEXT
);

-- 2. Bảng chứa Role (Admin, HR Manager, Employee...)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- Vd: ADMIN, HR_MANAGER, CUSTOMER
    description TEXT
);

-- 3. Bảng trung gian Role - Permission (RBAC)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT REFERENCES roles (id),
    permission_id INT REFERENCES permissions (id),
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Bảng User (Identity chính)
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
    role_id INT REFERENCES roles(id)
);

-- 5. Bảng Refresh Token (Quản lý phiên đăng nhập)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- SUPPLY CHAIN
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
-- 3. ÁNH XẠ ROLE_PERMISSIONS
-- =============================================================================

-- 3.1 EMPLOYEE
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'EMPLOYEE' AND p.code IN (
    'HRM_ACCOUNT_VIEW', 'HRM_ACCOUNT_UPDATE', 'HRM_BENEFIT_VIEW', 'HRM_CONTRACT_VIEW',
    'HRM_LEAVE_VIEW', 'HRM_LEAVE_CREATE', 'HRM_LEAVE_DELETE',
    'SUPPLYCHAIN_COMPANY_ASSETS_VIEW', 'ACCOUNTING_PAYROLL_VIEW'
) ON CONFLICT DO NOTHING;

-- 3.2 DEPT_MANAGER (kế thừa EMPLOYEE)
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

-- 3.3 HR_MANAGER (kế thừa DEPT_MANAGER)
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

-- 3.4 STOREKEEPER (kế thừa EMPLOYEE)
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
    'SUPPLYCHAIN_STOCK_TAKE_CREATE', 'SUPPLYCHAIN_STOCK_TAKE_UPDATE', 'SUPPLYCHAIN_STOCK_TAKE_DELETE'
) ON CONFLICT DO NOTHING;

-- 3.5 CFO (kế thừa EMPLOYEE)
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

-- 3.6 ADMIN (full permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 1. PURCHASING_MANAGER (kế thừa EMPLOYEE + Supply Chain)
-- -----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'PURCHASING_MANAGER'), permission_id
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

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
    'SUPPLYCHAIN_PURCHASE_RETURN_UPDATE', 'SUPPLYCHAIN_PURCHASE_RETURN_DELETE'
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. SALES_ADMIN (kế thừa EMPLOYEE + Sales + Goods Issue Request)
-- -----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'SALES_ADMIN'), permission_id
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SALES_ADMIN' AND p.code IN (
    'SUPPLYCHAIN_GOODS_ISSUE_REQUEST',
    'SALES_CUSTOMER_VIEW', 'SALES_CUSTOMER_UPDATE',
    'SALES_ORDER_MANAGEMENT_VIEW', 'SALES_POS_ORDER_CREATE',
    'SALES_ORDER_CONFIRM', 'SALES_ORDER_CANCEL', 'SALES_ORDER_MANAGEMENT_DELETE',
    'SALES_VOUCHER_VIEW', 'SALES_VOUCHER_CREATE',
    'SALES_VOUCHER_UPDATE', 'SALES_VOUCHER_DELETE',
    'SALES_PAYMENT_RECORDING_CONFIRM',
    'SALES_REPORT_VIEW', 'SALES_REPORT_EXPORT'
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. RECEIVABLE_ACC (kế thừa EMPLOYEE + Receipt + PO Confirm/Reject)
-- -----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'RECEIVABLE_ACC'), permission_id
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'RECEIVABLE_ACC' AND p.code IN (
    'SUPPLYCHAIN_PURCHASE_ORDER_CONFIRM', 'SUPPLYCHAIN_PURCHASE_ORDER_REJECT',
    'ACCOUNTING_RECEIPT_VIEW', 'ACCOUNTING_RECEIPT_CREATE',
    'ACCOUNTING_RECEIPT_UPDATE', 'ACCOUNTING_RECEIPT_DELETE'
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. PAYABLE_ACC (kế thừa EMPLOYEE + Payment)
-- -----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'PAYABLE_ACC'), permission_id
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'PAYABLE_ACC' AND p.code IN (
    'ACCOUNTING_PAYMENT_VIEW', 'ACCOUNTING_PAYMENT_CREATE',
    'ACCOUNTING_PAYMENT_UPDATE', 'ACCOUNTING_PAYMENT_DELETE'
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. PAYROLL_ACC (kế thừa EMPLOYEE + Payroll)
-- -----------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'PAYROLL_ACC'), permission_id
FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'PAYROLL_ACC' AND p.code IN (
    'ACCOUNTING_PAYROLL_VIEW', 'ACCOUNTING_PAYROLL_CREATE',
    'ACCOUNTING_PAYROLL_UPDATE', 'ACCOUNTING_PAYROLL_DELETE'
) ON CONFLICT DO NOTHING;
"""


def _strip_line_comments(sql: str) -> str:
    # Xoá các dòng comment bắt đầu bằng --
    out_lines = []
    for line in sql.splitlines():
        s = line.strip()
        if s.startswith("--") or s == "":
            continue
        out_lines.append(line)
    return "\n".join(out_lines)


def _split_sql_statements(sql: str) -> list[str]:
    # Tách theo dấu ; (script của bạn không có $$ hoặc ; trong string)
    cleaned = _strip_line_comments(sql)
    parts = cleaned.split(";")
    stmts = []
    for p in parts:
        stmt = p.strip()
        if stmt:
            stmts.append(stmt)
    return stmts


def main():
    engine = create_engine(IDENTITY_DB, future=True)

    stmts = _split_sql_statements(SQL_SCRIPT)
    print(f"Total statements: {len(stmts)}")

    # engine.begin() auto-commit/rollback theo transaction
    with engine.begin() as conn:
        for i, stmt in enumerate(stmts, 1):
            conn.exec_driver_sql(stmt)
            if i % 10 == 0 or i == len(stmts):
                print(f"Executed {i}/{len(stmts)}")

    print("DONE: Identity schema + seed roles/permissions/role_permissions.")


if __name__ == "__main__":
    main()
