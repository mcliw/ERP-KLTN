from sqlalchemy import (
    Column, Integer, String, ForeignKey,
    Date, DateTime, Time, Float, Numeric, Boolean, Enum, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.hrm_database import HrmBase

# =========================
# DEPARTMENT
# =========================
class Department(HrmBase):
    __tablename__ = "department"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True)
    name = Column(String(100))
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


# =========================
# POSITION
# =========================
class Position(HrmBase):
    __tablename__ = "position"

    id = Column(Integer, primary_key=True)
    title = Column(String(100))
    base_salary_range_min = Column(Numeric(15, 2))
    base_salary_range_max = Column(Numeric(15, 2))
    description = Column(String)


# =========================
# EMPLOYEE
# =========================
class Employee(HrmBase):
    __tablename__ = "employee"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)

    employee_code = Column(String(20), unique=True)
    full_name = Column(String(100))

    department_id = Column(Integer, ForeignKey("department.id"))
    position_id = Column(Integer, ForeignKey("position.id"))

    dob = Column(Date)
    gender = Column(Enum("MALE", "FEMALE", "OTHER", name="gender_enum"))

    phone = Column(String(20))
    email_company = Column(String(100))
    address = Column(String)

    identity_card = Column(String(20))
    bank_account_number = Column(String(50))
    bank_name = Column(String(100))

    status = Column(Enum("ACTIVE", "INACTIVE", name="employee_status_enum"))

    join_date = Column(Date)
    resign_date = Column(Date)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department")
    position = relationship("Position")


# =========================
# WORK SHIFT
# =========================
class WorkShift(HrmBase):
    __tablename__ = "work_shift"

    id = Column(Integer, primary_key=True)
    shift_name = Column(String(50))
    start_time = Column(Time)
    end_time = Column(Time)
    break_start_time = Column(Time)
    break_end_time = Column(Time)


# =========================
# TIMESHEET DAILY
# =========================
class TimesheetDaily(HrmBase):
    __tablename__ = "timesheet_daily"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employee.id"))
    date = Column(Date)

    work_shift_id = Column(Integer, ForeignKey("work_shift.id"))

    check_in_time = Column(Time)
    check_out_time = Column(Time)

    late_minutes = Column(Integer)
    early_leave_minutes = Column(Integer)
    ot_hours = Column(Float)

    status = Column(Enum("PRESENT", "ABSENT", "LEAVE", name="timesheet_status_enum"))
    working_day_count = Column(Float)

    note = Column(String)

    employee = relationship("Employee")
    work_shift = relationship("WorkShift")


# =========================
# ATTENDANCE LOG
# =========================
class AttendanceLog(HrmBase):
    __tablename__ = "attendance_log"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employee.id"))

    check_time = Column(DateTime)
    image_snapshot = Column(String(255))
    confidence_score = Column(Float)

    device_id = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


# =========================
# LEAVE REQUEST
# =========================
class LeaveRequest(HrmBase):
    __tablename__ = "leave_request"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employee.id"))

    leave_type = Column(Enum("ANNUAL", "SICK", "UNPAID", name="leave_type_enum"))
    from_date = Column(DateTime)
    to_date = Column(DateTime)

    total_days = Column(Float)
    reason = Column(String)

    status = Column(Enum("PENDING", "APPROVED", "REJECTED", name="leave_status_enum"))
    approver_id = Column(Integer)
    approved_at = Column(DateTime)


# =========================
# OT REQUEST
# =========================
class OTRequest(HrmBase):
    __tablename__ = "ot_request"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employee.id"))

    ot_date = Column(Date)
    from_time = Column(Time)
    to_time = Column(Time)

    total_hours = Column(Float)
    ot_type = Column(Enum("WEEKDAY", "WEEKEND", "HOLIDAY", name="ot_type_enum"))

    reason = Column(String)
    status = Column(Enum("PENDING", "APPROVED", "REJECTED", name="ot_status_enum"))
    approver_id = Column(Integer)


# =========================
# LABOR CONTRACT
# =========================
class LaborContract(HrmBase):
    __tablename__ = "labor_contract"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employee.id"))

    contract_number = Column(String(50))
    contract_type = Column(Enum("FIXED", "UNLIMITED", name="contract_type_enum"))

    start_date = Column(Date)
    end_date = Column(Date)

    basic_salary = Column(Numeric(15, 2))
    allowance_responsibility = Column(Numeric(15, 2))
    allowance_transport = Column(Numeric(15, 2))
    allowance_lunch = Column(Numeric(15, 2))

    file_path = Column(String(255))
    status = Column(Enum("ACTIVE", "EXPIRED", name="contract_status_enum"))

    created_at = Column(DateTime, default=datetime.utcnow)


# =========================
# SALARY RULE
# =========================
class SalaryRule(HrmBase):
    __tablename__ = "salary_rule"

    id = Column(Integer, primary_key=True)
    code = Column(String(50))
    name = Column(String(100))

    type = Column(Enum("ALLOWANCE", "DEDUCTION", name="salary_rule_type_enum"))
    formula = Column(String)

    is_active = Column(Boolean, default=True)


# =========================
# PAYROLL PERIOD
# =========================
class PayrollPeriod(HrmBase):
    __tablename__ = "payroll_period"

    id = Column(Integer, primary_key=True)
    name = Column(String(100))

    month = Column(Integer)
    year = Column(Integer)

    start_date = Column(Date)
    end_date = Column(Date)

    standard_working_days = Column(Integer)
    status = Column(Enum("OPEN", "CLOSED", name="payroll_status_enum"))

    created_at = Column(DateTime, default=datetime.utcnow)


# =========================
# PAYSLIP
# =========================
class Payslip(HrmBase):
    __tablename__ = "payslip"

    id = Column(Integer, primary_key=True)
    payroll_period_id = Column(Integer, ForeignKey("payroll_period.id"))
    employee_id = Column(Integer, ForeignKey("employee.id"))

    total_working_days = Column(Float)
    total_ot_hours = Column(Float)

    gross_salary = Column(Numeric(15, 2))
    total_deduction = Column(Numeric(15, 2))
    net_salary = Column(Numeric(15, 2))

    status = Column(Enum("DRAFT", "FINAL", name="payslip_status_enum"))
    created_at = Column(DateTime, default=datetime.utcnow)


# =========================
# PAYSLIP DETAIL
# =========================
class PayslipDetail(HrmBase):
    __tablename__ = "payslip_detail"

    id = Column(Integer, primary_key=True)
    payslip_id = Column(Integer, ForeignKey("payslip.id"))
    salary_rule_id = Column(Integer, ForeignKey("salary_rule.id"))

    amount = Column(Numeric(15, 2))
    note = Column(String)


# =========================
# EMPLOYEE FACE DATA
# =========================
class EmployeeFaceData(HrmBase):
    __tablename__ = "employee_face_data"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employee.id"))

    face_vector = Column(JSON)
    image_path = Column(String(255))

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# =========================
# PAYMENT REQUEST HRM
# =========================
class PaymentRequestHRM(HrmBase):
    __tablename__ = "payment_request_hrm"

    id = Column(Integer, primary_key=True)
    payroll_period_id = Column(Integer, ForeignKey("payroll_period.id"))

    request_code = Column(String(50))
    total_amount = Column(Numeric(15, 2))
    total_employees = Column(Integer)

    status = Column(Enum("PENDING", "SENT", "PAID", name="payment_hrm_status_enum"))
    finance_transaction_id = Column(Integer)

    created_by = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
