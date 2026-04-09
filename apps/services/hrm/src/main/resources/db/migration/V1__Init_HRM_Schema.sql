-- =========================================================
-- V1__Init_HRM_Schema.sql - SYNCHRONIZED WITH JAVA ENTITIES
-- =========================================================

-- Kích hoạt extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------
-- 1. ĐỊNH NGHĨA CÁC KIỂU DỮ LIỆU ENUM (TRẠNG THÁI)
-- ---------------------------------------------------------

-- [UPDATED] Trạng thái nhân viên (Khớp với entity/enums/EmployeeStatus.java)
DO $$ BEGIN
    CREATE TYPE employee_status_enum AS ENUM ('PROBATION', 'OFFICIAL', 'RESIGNED', 'TERMINATED', 'ACTIVE', 'ON_LEAVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trạng thái chấm công (Khớp với entity/enums/TimesheetStatus.java)
DO $$ BEGIN
    CREATE TYPE timesheet_status_enum AS ENUM ('ON_TIME', 'LATE', 'LEAVE_EARLY', 'ABSENT', 'LEAVE_PAID', 'LEAVE_UNPAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trạng thái đơn nghỉ phép (Khớp với entity/enums/LeaveStatus.java)
DO $$ BEGIN
    CREATE TYPE leave_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Loại nghỉ phép (Khớp với entity/enums/LeaveType.java)
DO $$ BEGIN
    CREATE TYPE leave_type_enum AS ENUM ('PAID', 'UNPAID', 'SICK', 'MATERNITY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trạng thái hợp đồng lương (Khớp với entity/enums/SalaryStatus.java)
DO $$ BEGIN
    CREATE TYPE salary_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------
-- 2. CÁC BẢNG CORE (PHÒNG BAN, CHỨC VỤ)
-- ---------------------------------------------------------

-- Bảng Phòng ban (Departments)
CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL, -- Entity: unique=true, nullable=false
    name VARCHAR(255) NOT NULL,        -- Entity: nullable=false
    description TEXT,
    manager_id INT,                    -- Entity: @OneToOne Employee manager
    status BOOLEAN DEFAULT TRUE,       -- Entity: columnDefinition = "boolean default true"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Chức vụ (Positions)
CREATE TABLE IF NOT EXISTS positions (
    position_id SERIAL PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL, -- Entity: unique=true, nullable=false
    name VARCHAR(255) NOT NULL,        -- Entity: nullable=false
    department_id INT REFERENCES departments(department_id),
    description TEXT,
    status BOOLEAN DEFAULT TRUE,       -- Entity: columnDefinition = "boolean default true"
    capacity INT DEFAULT 1,            -- Entity: columnDefinition = "int default 1"
    -- assigneeCount là @Transient nên không tạo cột
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 3. BẢNG NHÂN VIÊN & HỒ SƠ (MAIN ENTITY)
-- ---------------------------------------------------------

-- Bảng Nhân viên (Employees)
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    
    -- Định danh & Tài khoản
    employee_code VARCHAR(255) UNIQUE NOT NULL,
    account_id UUID,                            -- Entity: columnDefinition = "uuid"
    status VARCHAR(255),                        -- Entity: private String status;
    
    -- Thông tin cá nhân
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(255),
    birthday DATE,
    gender VARCHAR(255),
    identity_card VARCHAR(255),
    hometown VARCHAR(255),
    address VARCHAR(255),
    
    -- Thông tin công việc
    department_id INT REFERENCES departments(department_id),
    position_id INT REFERENCES positions(position_id),
    join_date DATE NOT NULL,
    status_empl employee_status_enum,           -- Entity: @Enumerated(EnumType.STRING)
    
    -- Thông tin ngân hàng
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(255),
    bank_account_name VARCHAR(255),
    
    avatar_url VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cập nhật Foreign Key cho Manager của Department
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_department_manager') THEN
        ALTER TABLE departments 
        ADD CONSTRAINT fk_department_manager 
        FOREIGN KEY (manager_id) REFERENCES employees(employee_id);
    END IF;
END $$;

-- Bảng Tài liệu nhân viên (EmployeeDocument)
CREATE TABLE IF NOT EXISTS employee_documents (
    document_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    document_type VARCHAR(255),
    file_path VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP
);

-- ---------------------------------------------------------
-- 4. BẢNG CHẤM CÔNG (ATTENDANCE)
-- ---------------------------------------------------------

-- Bảng Log Chấm công (AttendanceLog)
CREATE TABLE IF NOT EXISTS attendance_logs (
    log_id BIGSERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    check_time TIMESTAMP NOT NULL,
    image_url VARCHAR(255),
    confidence_score FLOAT,
    device_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Tổng hợp công ngày (Timesheet)
CREATE TABLE IF NOT EXISTS timesheets (
    timesheet_id BIGSERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    work_date DATE NOT NULL,
    
    check_in_time TIME,
    check_out_time TIME,
    working_hours FLOAT,
    paid_work_day FLOAT,
    
    status timesheet_status_enum,
    note VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 5. BẢNG NGHỈ PHÉP (LEAVE MANAGEMENT)
-- ---------------------------------------------------------

-- Bảng Quỹ phép (LeaveBalance)
CREATE TABLE IF NOT EXISTS leave_balances (
    balance_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    year INT,
    total_entitlement FLOAT,
    used FLOAT,
    
    -- Entity: insertable = false, updatable = false -> Generated column
    remaining FLOAT GENERATED ALWAYS AS (total_entitlement - used) STORED,
    
    UNIQUE(employee_id, year)
);

-- Bảng Đơn xin nghỉ phép (LeaveRequest)
CREATE TABLE IF NOT EXISTS leave_requests (
    request_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type leave_type_enum,
    reason VARCHAR(255),
    
    status leave_status_enum,
    approver_id INT REFERENCES employees(employee_id),
    rejection_reason VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 6. BẢNG LƯƠNG (PAYROLL)
-- ---------------------------------------------------------

-- Bảng Hợp đồng lương (SalaryContract)
CREATE TABLE IF NOT EXISTS salary_contracts (
    contract_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    
    base_salary NUMERIC(38, 2) NOT NULL, -- Entity dùng BigDecimal
    allowance NUMERIC(38, 2),
    insurance_salary NUMERIC(38, 2),
    
    effective_date DATE NOT NULL,
    status salary_status_enum,           -- Entity dùng Enum SalaryStatus
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Phiếu lương (Payslip)
CREATE TABLE IF NOT EXISTS payslips (
    payslip_id BIGSERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    
    month INT,
    year INT,
    
    standard_work_days FLOAT,
    actual_work_days FLOAT,
    leave_paid_days FLOAT,
    
    gross_salary NUMERIC(38, 2),
    tax_deduction NUMERIC(38, 2),
    insurance_deduction NUMERIC(38, 2),
    advance_payment NUMERIC(38, 2),
    net_salary NUMERIC(38, 2),
    
    status BOOLEAN, -- Entity dùng Boolean
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 7. INDEX & DATA SEEDING (DỮ LIỆU MẪU)
-- ---------------------------------------------------------

-- 1. TẠO DỮ LIỆU PHÒNG BAN
INSERT INTO departments (department_id, code, name, description, status) VALUES 
(1, 'DEP_HR', 'Phòng Nhân Sự', 'Quản lý nhân sự, tuyển dụng và đào tạo', true),
(2, 'DEP_IT', 'Phòng Kỹ Thuật', 'Phát triển sản phẩm, bảo trì hệ thống và hạ tầng mạng', true),
(3, 'DEP_SALES', 'Phòng Kinh Doanh', 'Tìm kiếm khách hàng, bán hàng và chăm sóc đối tác', true),
(4, 'DEP_FIN', 'Phòng Tài Chính - Kế Toán', 'Quản lý thu chi, lương thưởng và báo cáo thuế', true),
(5, 'DEP_SC', 'Phòng Chuỗi Cung Ứng', 'Quản lý kho vận, nhập xuất hàng hóa', true)
ON CONFLICT (department_id) DO NOTHING;
SELECT setval('departments_department_id_seq', (SELECT MAX(department_id) FROM departments));

-- 2. TẠO DỮ LIỆU CHỨC VỤ
INSERT INTO positions (position_id, code, name, department_id, description, capacity, status) VALUES 
(1, 'POS_HR_MGR', 'Trưởng phòng Nhân Sự', 1, 'Quản lý toàn bộ hoạt động HR', 1, true),
(2, 'POS_HR_EXEC', 'Chuyên viên Nhân sự', 1, 'Tuyển dụng và C&B', 5, true),
(3, 'POS_IT_MGR', 'Trưởng phòng Kỹ Thuật', 2, 'CTO/Tech Lead', 1, true),
(4, 'POS_DEV_BE', 'Backend Developer', 2, 'Lập trình viên Server/API', 10, true),
(5, 'POS_DEV_FE', 'Frontend Developer', 2, 'Lập trình viên UI/UX', 10, true),
(6, 'POS_TESTER', 'QC/Tester', 2, 'Kiểm thử phần mềm', 5, true),
(7, 'POS_SALES_MGR', 'Trưởng phòng Kinh Doanh', 3, 'Quản lý doanh số', 1, true),
(8, 'POS_SALES_EXEC', 'Nhân viên Kinh Doanh', 3, 'Sales man', 20, true),
(9, 'POS_ACC_MGR', 'Kế toán trưởng', 4, 'Kiểm soát tài chính', 1, true),
(10, 'POS_ACC_STAFF', 'Kế toán viên', 4, 'Hạch toán chi tiết', 3, true),
(11, 'POS_SC_MGR', 'Trưởng phòng Kho vận', 5, 'Quản lý kho', 1, true),
(12, 'POS_WH_KEEPER', 'Thủ kho', 5, 'Quản lý xuất nhập tồn', 5, true)
ON CONFLICT (position_id) DO NOTHING;
SELECT setval('positions_position_id_seq', (SELECT MAX(position_id) FROM positions));

-- 3. TẠO DỮ LIỆU NHÂN VIÊN
INSERT INTO employees (
    employee_id, employee_code, account_id, email, full_name, 
    gender, birthday, phone, identity_card, 
    hometown, address, department_id, position_id, 
    join_date, status, status_empl, 
    bank_name, bank_account_number, bank_account_name, created_at, updated_at
) VALUES 
(1, 'EMP001', uuid_generate_v4(), 'admin@ldg.company', 'Lê Minh Dũng', 
 'Nam', '1990-05-23', '0950797411', '001218730001', 
 'Hà Nội', 'Số 30 Tôn Đức Thắng, Đống Đa, Hà Nội', 
 1, 1, '2022-01-01', 'Active', 'OFFICIAL', 
 'Vietcombank', '1014567890', 'Lê Minh Dũng', NOW(), NOW()),

(2, 'EMP002', uuid_generate_v4(), 'it.manager@ldg.company', 'Trần Đức Em', 
 'Nam', '1992-09-03', '0918935772', '001361801002', 
 'Nam Định', 'P. Dịch Vọng Hậu, Cầu Giấy, Hà Nội', 
 2, 3, '2022-03-15', 'Active', 'OFFICIAL', 
 'Techcombank', '1903456789012', 'Trần Đức Em', NOW(), NOW()),

(3, 'EMP003', uuid_generate_v4(), 'sales.manager@ldg.company', 'Nguyễn Mai Linh', 
 'Nữ', '1993-02-22', '0952539353', '001105686603', 
 'Hải Phòng', 'Time City, Minh Khai, Hà Nội', 
 3, 7, '2023-01-10', 'Active', 'OFFICIAL', 
 'MBBank', '0952539353', 'Nguyễn Mai Linh', NOW(), NOW()),

(4, 'EMP004', uuid_generate_v4(), 'finance.manager@ldg.company', 'Phạm Thu Hương', 
 'Nữ', '1988-11-08', '0994876804', '001875507004', 
 'Thái Bình', 'Royal City, Thanh Xuân, Hà Nội', 
 4, 9, '2021-06-01', 'Active', 'OFFICIAL', 
 'BIDV', '21510002345678', 'Phạm Thu Hương', NOW(), NOW()),

(5, 'EMP005', uuid_generate_v4(), 'sc.manager@ldg.company', 'Hoàng Văn Thái', 
 'Nam', '1991-08-24', '0968182935', '001840194005', 
 'Nghệ An', 'Mỹ Đình, Nam Từ Liêm, Hà Nội', 
 5, 11, '2023-05-20', 'Active', 'OFFICIAL', 
 'VPBank', '123456789', 'Hoàng Văn Thái', NOW(), NOW()),

(6, 'EMP006', uuid_generate_v4(), 'hr.staff@ldg.company', 'Nguyễn Mai Châu', 
 'Nữ', '1995-09-01', '0941394816', '001794392006', 
 'Hà Nội', 'Hoàn Kiếm, Hà Nội', 
 1, 2, '2023-08-01', 'Active', 'OFFICIAL', 
 'TPBank', '00012345678', 'Nguyễn Mai Châu', NOW(), NOW()),

(7, 'EMP007', uuid_generate_v4(), 'dev.be@ldg.company', 'Đỗ Quang Khải', 
 'Nam', '1996-12-12', '0977112233', '001234567007', 
 'Hưng Yên', 'Thanh Xuân, Hà Nội', 
 2, 4, '2024-01-15', 'Active', 'PROBATION', 
 'Vietinbank', '108000123456', 'Đỗ Quang Khải', NOW(), NOW()),

(8, 'EMP008', uuid_generate_v4(), 'dev.fe@ldg.company', 'Lê Thị Bưởi', 
 'Nữ', '1997-04-30', '0988223344', '001234567008', 
 'Bắc Ninh', 'Long Biên, Hà Nội', 
 2, 5, '2024-02-01', 'Active', 'PROBATION', 
 'ACB', '1234567', 'Lê Thị Bưởi', NOW(), NOW()),

(9, 'EMP009', uuid_generate_v4(), 'sales.exec@ldg.company', 'Đặng Quốc Hùng', 
 'Nam', '1994-10-20', '0912345678', '001234567009', 
 'Hà Nam', 'Hà Đông, Hà Nội', 
 3, 8, '2023-11-11', 'Active', 'OFFICIAL', 
 'VIB', '987654321', 'Đặng Quốc Hùng', NOW(), NOW()),

(10, 'EMP010', uuid_generate_v4(), 'acc.staff@ldg.company', 'Vũ Thị Mận', 
 'Nữ', '1993-01-01', '0909090909', '001234567010', 
 'Vĩnh Phúc', 'Cầu Giấy, Hà Nội', 
 4, 10, '2022-10-10', 'Active', 'OFFICIAL', 
 'Sacombank', '020012345678', 'Vũ Thị Mận', NOW(), NOW())
ON CONFLICT (employee_id) DO NOTHING;
SELECT setval('employees_employee_id_seq', (SELECT MAX(employee_id) FROM employees));

-- 4. CẬP NHẬT TRƯỞNG PHÒNG
UPDATE departments SET manager_id = 1 WHERE department_id = 1;
UPDATE departments SET manager_id = 2 WHERE department_id = 2;
UPDATE departments SET manager_id = 3 WHERE department_id = 3;
UPDATE departments SET manager_id = 4 WHERE department_id = 4;
UPDATE departments SET manager_id = 5 WHERE department_id = 5;

-- 5. TẠO HỢP ĐỒNG LƯƠNG
INSERT INTO salary_contracts (employee_id, base_salary, allowance, insurance_salary, effective_date, status) VALUES
(1, 25000000, 2000000, 10000000, '2022-01-01', 'ACTIVE'),
(2, 35000000, 3000000, 12000000, '2022-03-15', 'ACTIVE'),
(3, 30000000, 5000000, 10000000, '2023-01-10', 'ACTIVE'),
(4, 28000000, 2000000, 10000000, '2021-06-01', 'ACTIVE'),
(5, 22000000, 3000000, 9000000,  '2023-05-20', 'ACTIVE'),
(6, 12000000, 1000000, 6000000,  '2023-08-01', 'ACTIVE'),
(7, 18000000, 1500000, 8000000,  '2024-01-15', 'ACTIVE'),
(8, 16000000, 1500000, 8000000,  '2024-02-01', 'ACTIVE'),
(9, 10000000, 2000000, 5000000,  '2023-11-11', 'ACTIVE'),
(10, 14000000, 1000000, 7000000, '2022-10-10', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- 6. TẠO QUỸ PHÉP
INSERT INTO leave_balances (employee_id, year, total_entitlement, used) VALUES
(1, 2026, 14, 2),
(2, 2026, 14, 5),
(3, 2026, 12, 0),
(4, 2026, 15, 1),
(5, 2026, 12, 3),
(6, 2026, 12, 6),
(7, 2026, 12, 0),
(8, 2026, 12, 0),
(9, 2026, 12, 1),
(10, 2026, 12, 2)
ON CONFLICT (employee_id, year) DO NOTHING;

-- 7. TẠO DỮ LIỆU CHẤM CÔNG
INSERT INTO timesheets (employee_id, work_date, check_in_time, check_out_time, working_hours, paid_work_day, status, note) VALUES
(1, CURRENT_DATE - INTERVAL '1 day', '08:00:00', '17:30:00', 8.5, 1.0, 'ON_TIME', NULL),
(2, CURRENT_DATE - INTERVAL '1 day', '08:15:00', '18:00:00', 8.0, 1.0, 'LATE', 'Đi muộn 15p'),
(3, CURRENT_DATE - INTERVAL '1 day', '07:55:00', '17:00:00', 8.0, 1.0, 'ON_TIME', NULL),
(7, CURRENT_DATE - INTERVAL '1 day', '08:30:00', '17:30:00', 8.0, 1.0, 'ON_TIME', NULL),

(1, CURRENT_DATE - INTERVAL '2 days', '07:50:00', '17:40:00', 9.0, 1.0, 'ON_TIME', NULL),
(2, CURRENT_DATE - INTERVAL '2 days', '08:00:00', '17:30:00', 8.5, 1.0, 'ON_TIME', NULL),
(6, CURRENT_DATE - INTERVAL '2 days', NULL, NULL, 0, 0, 'ABSENT', 'Nghỉ không phép'),

(1, CURRENT_DATE - INTERVAL '3 days', '08:00:00', '17:30:00', 8.5, 1.0, 'ON_TIME', NULL),
(7, CURRENT_DATE - INTERVAL '3 days', '08:00:00', '12:00:00', 4.0, 0.5, 'LEAVE_EARLY', 'Xin về sớm đi viện')
ON CONFLICT (employee_id, work_date) DO NOTHING;

-- 8. TẠO ĐƠN NGHỈ PHÉP
INSERT INTO leave_requests (employee_id, start_date, end_date, leave_type, reason, status, approver_id) VALUES
(2, CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '6 days', 'PAID', 'Đi du lịch cùng gia đình', 'PENDING', 1),
(6, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '10 days', 'SICK', 'Bị cảm cúm', 'APPROVED', 1),
(7, CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', 'UNPAID', 'Việc cá nhân', 'REJECTED', 2)
ON CONFLICT DO NOTHING;