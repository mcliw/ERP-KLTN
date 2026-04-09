-- =================================================================
-- V1__Init_Accounting_Schema.sql
-- SYNCHRONIZED WITH JAVA ENTITIES
-- =================================================================

-- 1. DATABASE SETUP (Optional references)
-- CREATE DATABASE finance_db;
-- \c finance_db;

-- Xóa các bảng cũ nếu tồn tại (Clean Slate)
DROP TABLE IF EXISTS cash_transactions CASCADE;
DROP TABLE IF EXISTS ar_invoices CASCADE;
DROP TABLE IF EXISTS ap_invoices CASCADE;
DROP TABLE IF EXISTS journal_entry_lines CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS posting_rules CASCADE;
DROP TABLE IF EXISTS fiscal_periods CASCADE;
DROP TABLE IF EXISTS business_partners CASCADE;
DROP TABLE IF EXISTS chart_of_accounts CASCADE;

-- Xóa các Type Enum cũ
DROP TYPE IF EXISTS account_type_enum CASCADE;
DROP TYPE IF EXISTS partner_type_enum CASCADE;
DROP TYPE IF EXISTS fiscal_period_status_enum CASCADE;
DROP TYPE IF EXISTS module_source_enum CASCADE;
DROP TYPE IF EXISTS entry_status_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS payment_method_enum CASCADE;
DROP TYPE IF EXISTS balance_side_enum CASCADE;

-- =================================================================
-- 2. DEFINE ENUM TYPES (Khớp với package entity.enums)
-- =================================================================

-- entity/enums/AccountType.java
CREATE TYPE account_type_enum AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- entity/enums/PartnerType.java
CREATE TYPE partner_type_enum AS ENUM ('CUSTOMER', 'SUPPLIER', 'EMPLOYEE');

-- entity/enums/FiscalPeriodStatus.java
CREATE TYPE fiscal_period_status_enum AS ENUM ('OPEN', 'CLOSED');

-- entity/enums/ModuleSource.java
CREATE TYPE module_source_enum AS ENUM ('PURCHASING', 'SALES', 'HRM', 'INVENTORY', 'MANUAL', 'TREASURY');

-- entity/enums/EntryStatus.java
CREATE TYPE entry_status_enum AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');

-- entity/enums/PaymentStatus.java
CREATE TYPE payment_status_enum AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- entity/enums/TransactionType.java
CREATE TYPE transaction_type_enum AS ENUM ('RECEIPT', 'PAYMENT');

-- entity/enums/PaymentMethod.java
CREATE TYPE payment_method_enum AS ENUM ('CASH', 'BANK_TRANSFER');

-- entity/enums/BalanceSide.java
CREATE TYPE balance_side_enum AS ENUM ('DEBIT', 'CREDIT', 'BOTH');

-- =================================================================
-- 3. MASTER DATA TABLES
-- =================================================================

-- entity/ChartOfAccounts.java
CREATE TABLE chart_of_accounts (
    account_id SERIAL PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL UNIQUE, -- @Column(length = 20)
    account_name VARCHAR(255) NOT NULL,
    account_type account_type_enum NOT NULL,
    balance_side balance_side_enum DEFAULT 'BOTH',
    parent_account_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(account_id)
);

-- entity/BusinessPartner.java
CREATE TABLE business_partners (
    partner_id SERIAL PRIMARY KEY,
    partner_type partner_type_enum NOT NULL,
    external_id VARCHAR(50) NOT NULL, -- @Column(length = 50)
    partner_name VARCHAR(255) NOT NULL,
    tax_code VARCHAR(50),
    contact_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (partner_type, external_id) -- @UniqueConstraint
);

-- entity/FiscalPeriod.java
CREATE TABLE fiscal_periods (
    period_id SERIAL PRIMARY KEY,
    period_name VARCHAR(50),          -- @Column(length = 50)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status fiscal_period_status_enum DEFAULT 'OPEN',
    closed_at TIMESTAMP,
    closed_by_user_id VARCHAR(50)
);

-- entity/PostingRule.java
CREATE TABLE posting_rules (
    rule_id SERIAL PRIMARY KEY,
    event_code VARCHAR(50) NOT NULL UNIQUE, -- @Column(length = 50, unique=true)
    event_description VARCHAR(255),
    debit_account_id INT NOT NULL,
    credit_account_id INT NOT NULL,
    module_source module_source_enum NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (debit_account_id) REFERENCES chart_of_accounts(account_id),
    FOREIGN KEY (credit_account_id) REFERENCES chart_of_accounts(account_id)
);

-- =================================================================
-- 4. CORE LEDGER TABLES
-- =================================================================

-- entity/JournalEntry.java
CREATE TABLE journal_entries (
    entry_id BIGSERIAL PRIMARY KEY,
    transaction_date DATE NOT NULL,
    posting_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_no VARCHAR(50),         -- @Column(length = 50)
    description TEXT,
    source_module module_source_enum NOT NULL,
    status entry_status_enum DEFAULT 'POSTED',
    fiscal_period_id INT,
    total_amount NUMERIC(19, 4) NOT NULL, -- BigDecimal precision=19, scale=4
    created_by VARCHAR(50),
    
    FOREIGN KEY (fiscal_period_id) REFERENCES fiscal_periods(period_id)
);

-- entity/JournalEntryLine.java
CREATE TABLE journal_entry_lines (
    line_id BIGSERIAL PRIMARY KEY,
    entry_id BIGINT NOT NULL,
    account_id INT NOT NULL,
    partner_id INT,
    debit_amount NUMERIC(19, 4) DEFAULT 0,
    credit_amount NUMERIC(19, 4) DEFAULT 0,
    description VARCHAR(255),
    
    FOREIGN KEY (entry_id) REFERENCES journal_entries(entry_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(account_id),
    FOREIGN KEY (partner_id) REFERENCES business_partners(partner_id)
);

-- =================================================================
-- 5. SUB-LEDGER TABLES (INVOICES & CASH)
-- =================================================================

-- entity/ApInvoice.java (Accounts Payable - Phải trả)
CREATE TABLE ap_invoices (
    invoice_id BIGSERIAL PRIMARY KEY,
    partner_id INT NOT NULL,
    purchase_order_ref VARCHAR(50),
    invoice_date DATE,
    due_date DATE,
    total_amount NUMERIC(19, 4),
    paid_amount NUMERIC(19, 4) DEFAULT 0,
    payment_status payment_status_enum DEFAULT 'UNPAID',
    entry_id BIGINT, -- OneToOne, nullable (có thể tạo hóa đơn nháp chưa post sổ)
    
    FOREIGN KEY (partner_id) REFERENCES business_partners(partner_id),
    FOREIGN KEY (entry_id) REFERENCES journal_entries(entry_id)
);

-- entity/ArInvoice.java (Accounts Receivable - Phải thu)
CREATE TABLE ar_invoices (
    invoice_id BIGSERIAL PRIMARY KEY,
    partner_id INT NOT NULL,
    sales_order_ref VARCHAR(50),
    invoice_date DATE,
    due_date DATE,
    total_amount NUMERIC(19, 4),
    received_amount NUMERIC(19, 4) DEFAULT 0,
    payment_status payment_status_enum DEFAULT 'UNPAID',
    entry_id BIGINT, -- OneToOne, nullable
    
    FOREIGN KEY (partner_id) REFERENCES business_partners(partner_id),
    FOREIGN KEY (entry_id) REFERENCES journal_entries(entry_id)
);

-- entity/CashTransaction.java
CREATE TABLE cash_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    transaction_code VARCHAR(50),    -- @Column(length = 50)
    transaction_type transaction_type_enum NOT NULL,
    amount NUMERIC(19, 4) NOT NULL,
    payment_method payment_method_enum NOT NULL,
    bank_account_number VARCHAR(50),
    reference_doc_id BIGINT,         -- Loose coupling link to Invoice IDs
    description TEXT,
    entry_id BIGINT NOT NULL,        -- @JoinColumn(nullable = false)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (entry_id) REFERENCES journal_entries(entry_id)
);

-- Index cho tìm kiếm nhanh mã giao dịch
CREATE INDEX idx_cash_trans_code ON cash_transactions(transaction_code);

-- =================================================================
-- 6. DATA SEEDING (DỮ LIỆU MẪU)
-- =================================================================

-- 1. Chart of Accounts (Hệ thống tài khoản)
INSERT INTO chart_of_accounts (account_code, account_name, account_type, balance_side, parent_account_id) VALUES 
('111', 'Tiền mặt', 'ASSET', 'DEBIT', NULL),
('112', 'Tiền gửi ngân hàng', 'ASSET', 'DEBIT', NULL),
('131', 'Phải thu khách hàng', 'ASSET', 'BOTH', NULL), -- Lưỡng tính
('156', 'Hàng hóa', 'ASSET', 'DEBIT', NULL),
('331', 'Phải trả người bán', 'LIABILITY', 'BOTH', NULL), -- Lưỡng tính
('334', 'Phải trả người lao động', 'LIABILITY', 'CREDIT', NULL),
('511', 'Doanh thu bán hàng', 'REVENUE', 'CREDIT', NULL),
('632', 'Giá vốn hàng bán', 'EXPENSE', 'DEBIT', NULL),
('642', 'Chi phí quản lý doanh nghiệp', 'EXPENSE', 'DEBIT', NULL),
('911', 'Xác định kết quả kinh doanh', 'EQUITY', 'BOTH', NULL)
ON CONFLICT (account_code) DO NOTHING;

-- 2. Posting Rules (Quy tắc hạch toán tự động)
INSERT INTO posting_rules (event_code, event_description, debit_account_id, credit_account_id, module_source, is_active) VALUES
(
    'GRN_CONFIRMED', 
    'Nhập kho mua hàng', 
    (SELECT account_id FROM chart_of_accounts WHERE account_code='156'), 
    (SELECT account_id FROM chart_of_accounts WHERE account_code='331'), 
    'PURCHASING',
    TRUE
),
(
    'ORDER_COMPLETED', 
    'Bán hàng thành công', 
    (SELECT account_id FROM chart_of_accounts WHERE account_code='131'), 
    (SELECT account_id FROM chart_of_accounts WHERE account_code='511'), 
    'SALES',
    TRUE
),
(
    'PAYROLL_APPROVED', 
    'Hạch toán lương', 
    (SELECT account_id FROM chart_of_accounts WHERE account_code='642'), 
    (SELECT account_id FROM chart_of_accounts WHERE account_code='334'), 
    'HRM',
    TRUE
)
ON CONFLICT (event_code) DO NOTHING;