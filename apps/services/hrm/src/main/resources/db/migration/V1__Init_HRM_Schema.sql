-- Kích hoạt extension UUID để tạo ID ngẫu nhiên cho account linkage (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------
-- 1. ĐỊNH NGHĨA CÁC KIỂU DỮ LIỆU ENUM (TRẠNG THÁI)
-- ---------------------------------------------------------

-- Trạng thái nhân viên
DO $$ BEGIN
    CREATE TYPE employee_status_enum AS ENUM ('PROBATION', 'OFFICIAL', 'RESIGNED', 'TERMINATED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trạng thái chấm công hàng ngày
DO $$ BEGIN
    CREATE TYPE timesheet_status_enum AS ENUM ('ON_TIME', 'LATE', 'LEAVE_EARLY', 'ABSENT', 'LEAVE_PAID', 'LEAVE_UNPAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trạng thái đơn nghỉ phép
DO $$ BEGIN
    CREATE TYPE leave_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Loại nghỉ phép
DO $$ BEGIN
    CREATE TYPE leave_type_enum AS ENUM ('PAID', 'UNPAID', 'SICK', 'MATERNITY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------
-- 2. CÁC BẢNG CORE (PHÒNG BAN, CHỨC VỤ)
-- ---------------------------------------------------------

-- Bảng Phòng ban (Departments)
-- 1.1.1.4: Quản lý phòng ban
CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- Mã phòng ban
    name VARCHAR(100) NOT NULL,       -- Tên phòng ban
    description TEXT,
    manager_id INT,                   -- Trưởng phòng (Sẽ link tới employees sau)
    status BOOLEAN DEFAULT TRUE,      -- Trạng thái hoạt động
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Chức vụ (Positions)
-- 1.1.1.5: Quản lý chức vụ
CREATE TABLE IF NOT EXISTS positions (
    position_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- Mã chức vụ
    name VARCHAR(100) NOT NULL,       -- Tên chức vụ
    department_id INT REFERENCES departments(department_id), -- Thuộc phòng ban nào
    quota INT DEFAULT 1,              -- Số lượng người có thể đảm nhận
    description TEXT,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 3. BẢNG NHÂN VIÊN & HỒ SƠ (MAIN ENTITY)
-- ---------------------------------------------------------

-- Bảng Nhân viên (Employees)
-- 1.1.1.2 & 1.1.1.3: Thông tin cá nhân & Hồ sơ
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    
    -- Định danh & Tài khoản
    employee_code VARCHAR(50) UNIQUE NOT NULL, -- Mã NV
    account_id UUID DEFAULT uuid_generate_v4(), -- ID ngẫu nhiên để Entity Service map với Account
    status VARCHAR(20) DEFAULT 'YET', 
    -- Thông tin cá nhân cơ bản
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL, -- Dùng làm username
    phone VARCHAR(20),
    birthday DATE,
    gender VARCHAR(10),                 -- Nam/Nữ/Khác
    identity_card VARCHAR(20),          -- CCCD/CMND
    hometown VARCHAR(255),              -- Quê quán
    address TEXT,                       -- Địa chỉ hiện tại
    
    -- Thông tin công việc
    department_id INT REFERENCES departments(department_id),
    position_id INT REFERENCES positions(position_id),
    join_date DATE NOT NULL,
    status_empl employee_status_enum DEFAULT 'PROBATION',
    
    -- Thông tin ngân hàng (để chi lương)
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    
    -- Dữ liệu sinh trắc học (FaceNet)
    -- Lưu vector đặc trưng khuôn mặt (thường là mảng float 128 hoặc 512 chiều)
    face_embedding FLOAT[], 
    avatar_url TEXT,                    -- Link ảnh đại diện
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cập nhật lại Foreign Key cho Manager của Department (tránh vòng lặp khi tạo bảng)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_department_manager') THEN
        ALTER TABLE departments 
        ADD CONSTRAINT fk_department_manager 
        FOREIGN KEY (manager_id) REFERENCES employees(employee_id);
    END IF;
END $$;

-- Bảng Tài liệu nhân viên (Documents)
-- 1.1.1.4: Hợp đồng, CV, Bằng cấp
CREATE TABLE IF NOT EXISTS employee_documents (
    document_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    document_type VARCHAR(50), -- CONTRACT, CV, HEALTH_CHECK, CERTIFICATE
    file_path TEXT NOT NULL,   -- Đường dẫn file PDF/Image
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 4. BẢNG CHẤM CÔNG (ATTENDANCE)
-- ---------------------------------------------------------

-- Bảng Log Chấm công thô (Raw Logs từ Camera/FaceID)
-- 1.1.1.5: Chấm công khuôn mặt
CREATE TABLE IF NOT EXISTS attendance_logs (
    log_id BIGSERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    check_time TIMESTAMP NOT NULL, -- Thời điểm quét mặt
    image_url TEXT,                -- Ảnh chụp lúc chấm công (để đối chiếu)
    confidence_score FLOAT,        -- Độ chính xác AI nhận diện
    device_id VARCHAR(50),         -- IP Camera hoặc ID thiết bị
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Tổng hợp công ngày (Timesheets)
-- 1.1.1.6: Xử lý Bảng công (đã xử lý logic vào muộn/về sớm)
CREATE TABLE IF NOT EXISTS timesheets (
    timesheet_id BIGSERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    work_date DATE NOT NULL,
    
    check_in_time TIME,            -- Giờ vào sớm nhất
    check_out_time TIME,           -- Giờ ra muộn nhất
    
    -- Các chỉ số tính công
    working_hours FLOAT DEFAULT 0, -- Số giờ làm thực tế
    paid_work_day FLOAT DEFAULT 0, -- Số công tính lương (1.0, 0.5, 0)
    
    status timesheet_status_enum DEFAULT 'ABSENT', -- Trạng thái (Đi muộn, Đúng giờ...)
    note TEXT,                     -- Ghi chú (VD: Quên checkin được duyệt bổ sung)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, work_date) -- Một nhân viên chỉ có 1 dòng tổng hợp mỗi ngày
);

-- ---------------------------------------------------------
-- 5. BẢNG NGHỈ PHÉP (LEAVE MANAGEMENT)
-- ---------------------------------------------------------

-- Bảng Quỹ phép (Leave Balance)
-- 1.1.2: Chatbot sẽ query bảng này để trả lời "Còn bao nhiêu phép"
CREATE TABLE IF NOT EXISTS leave_balances (
    balance_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    year INT NOT NULL,                  -- Năm quản lý (VD: 2026)
    total_entitlement FLOAT DEFAULT 12, -- Tổng phép được hưởng
    used FLOAT DEFAULT 0,               -- Đã dùng
    remaining FLOAT GENERATED ALWAYS AS (total_entitlement - used) STORED, -- Còn lại (tự động tính)
    
    UNIQUE(employee_id, year)
);

-- Bảng Đơn xin nghỉ phép (Leave Requests)
-- 1.1.2: Quản lý nghỉ phép
CREATE TABLE IF NOT EXISTS leave_requests (
    request_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type leave_type_enum DEFAULT 'PAID',
    reason TEXT,
    
    status leave_status_enum DEFAULT 'PENDING',
    approver_id INT REFERENCES employees(employee_id), -- Người duyệt (Quản lý)
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 6. BẢNG LƯƠNG (PAYROLL)
-- ---------------------------------------------------------

-- Bảng Thông tin lương theo hợp đồng (Salary Contracts/Rules)
-- 1.1.3: Quản lý thông tin lương
CREATE TABLE IF NOT EXISTS salary_contracts (
    contract_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    
    base_salary NUMERIC(15, 2) NOT NULL,      -- Lương cơ bản
    allowance NUMERIC(15, 2) DEFAULT 0,       -- Phụ cấp cố định
    insurance_salary NUMERIC(15, 2),          -- Mức lương đóng bảo hiểm
    
    effective_date DATE NOT NULL,             -- Ngày bắt đầu áp dụng
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng Phiếu lương hàng tháng (Payslips)
-- 1.1.3: Báo cáo & Chatbot trả lời lương tháng
CREATE TABLE IF NOT EXISTS payslips (
    payslip_id BIGSERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(employee_id),
    
    month INT NOT NULL,
    year INT NOT NULL,
    
    -- Chi tiết thu nhập
    standard_work_days FLOAT,       -- Số công chuẩn tháng
    actual_work_days FLOAT,         -- Số công thực tế đi làm
    leave_paid_days FLOAT,          -- Số ngày nghỉ có lương
    
    gross_salary NUMERIC(15, 2),    -- Tổng thu nhập trước thuế
    
    -- Các khoản trừ
    tax_deduction NUMERIC(15, 2) DEFAULT 0,       -- Thuế TNCN
    insurance_deduction NUMERIC(15, 2) DEFAULT 0, -- Bảo hiểm
    advance_payment NUMERIC(15, 2) DEFAULT 0,     -- Tạm ứng
    
    net_salary NUMERIC(15, 2),      -- Thực lĩnh (Gross - Trừ)
    
    status BOOLEAN DEFAULT FALSE,   -- False: Nháp, True: Đã chốt/Đã gửi
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, month, year)
);

-- ---------------------------------------------------------
-- 7. INDEX (TỐI ƯU HÓA)
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(check_time);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(work_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);