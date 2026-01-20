from __future__ import annotations

import enum
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    Index,
    Enum as SAEnum,
    text,
    Computed,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

from app.db.hrm_database import HrmBase
Base = HrmBase

# =========================
# ENUMS (đúng như SQL)
# =========================
class EmployeeStatusEnum(str, enum.Enum):
    PROBATION = "PROBATION"
    OFFICIAL = "OFFICIAL"
    RESIGNED = "RESIGNED"
    TERMINATED = "TERMINATED"


class TimesheetStatusEnum(str, enum.Enum):
    ON_TIME = "ON_TIME"
    LATE = "LATE"
    LEAVE_EARLY = "LEAVE_EARLY"
    ABSENT = "ABSENT"
    LEAVE_PAID = "LEAVE_PAID"
    LEAVE_UNPAID = "LEAVE_UNPAID"


class LeaveStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class LeaveTypeEnum(str, enum.Enum):
    PAID = "PAID"
    UNPAID = "UNPAID"
    SICK = "SICK"
    MATERNITY = "MATERNITY"


# =========================
# TABLES
# =========================
class Department(Base):
    __tablename__ = "departments"

    department_id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)

    manager_id = Column(Integer, ForeignKey("employees.employee_id"))
    status = Column(Boolean, server_default=text("TRUE"), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    positions = relationship("Position", back_populates="department")
    employees = relationship(
        "Employee",
        back_populates="department",
        foreign_keys="Employee.department_id",  # ✅ hoặc [Employee.department_id]
    )

    manager = relationship(
        "Employee",
        foreign_keys=[manager_id],      # ✅ chỉ rõ dùng departments.manager_id
        uselist=False,
    )


class Position(Base):
    __tablename__ = "positions"

    position_id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)

    department_id = Column(Integer, ForeignKey("departments.department_id"))
    quota = Column(Integer, server_default=text("1"), nullable=False)
    description = Column(Text)
    status = Column(Boolean, server_default=text("TRUE"), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    department = relationship("Department", back_populates="positions")
    employees = relationship("Employee", back_populates="position")


class Employee(Base):
    __tablename__ = "employees"

    employee_id = Column(Integer, primary_key=True)

    employee_code = Column(String(50), unique=True, nullable=False)

    # account_id UUID DEFAULT uuid_generate_v4()
    account_id = Column(UUID(as_uuid=True), server_default=text("uuid_generate_v4()"), nullable=False)

    # status VARCHAR(20) DEFAULT 'YET'
    status = Column(String(20), server_default=text("'YET'"), nullable=False)

    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)

    phone = Column(String(20))
    birthday = Column(Date)
    gender = Column(String(10))
    identity_card = Column(String(20))
    hometown = Column(String(255))
    address = Column(Text)

    department_id = Column(Integer, ForeignKey("departments.department_id"))
    position_id = Column(Integer, ForeignKey("positions.position_id"))

    join_date = Column(Date, nullable=False)

    status_empl = Column(
        SAEnum(EmployeeStatusEnum, name="employee_status_enum"),
        server_default=text("'PROBATION'::employee_status_enum"),
        nullable=False,
    )

    bank_name = Column(String(100))
    bank_account_number = Column(String(50))

    face_embedding = Column(ARRAY(Float))  # FLOAT[]
    avatar_url = Column(Text)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    department = relationship("Department", back_populates="employees")
    position = relationship("Position", back_populates="employees")

    documents = relationship("EmployeeDocument", back_populates="employee", cascade="all, delete-orphan")
    attendance_logs = relationship("AttendanceLog", back_populates="employee", cascade="all, delete-orphan")
    timesheets = relationship("Timesheet", back_populates="employee", cascade="all, delete-orphan")

    leave_balances = relationship("LeaveBalance", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", foreign_keys="LeaveRequest.employee_id", back_populates="employee", cascade="all, delete-orphan")
    leave_requests_to_approve = relationship("LeaveRequest", foreign_keys="LeaveRequest.approver_id", back_populates="approver")

    salary_contracts = relationship("SalaryContract", back_populates="employee", cascade="all, delete-orphan")
    payslips = relationship("Payslip", back_populates="employee", cascade="all, delete-orphan")

    managed_departments = relationship("Department", foreign_keys=[Department.manager_id], back_populates="manager")

    department = relationship(
        "Department",
        back_populates="employees",
        foreign_keys=[department_id],   
    )


# Index đúng như SQL
Index("idx_employees_email", Employee.email)
Index("idx_employees_dept", Employee.department_id)


class EmployeeDocument(Base):
    __tablename__ = "employee_documents"

    document_id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)

    document_type = Column(String(50))
    file_path = Column(Text, nullable=False)
    upload_date = Column(DateTime, server_default=func.now(), nullable=False)

    employee = relationship("Employee", back_populates="documents")


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    log_id = Column(BigInteger, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False)

    check_time = Column(DateTime, nullable=False)
    image_url = Column(Text)
    confidence_score = Column(Float)
    device_id = Column(String(50))

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    employee = relationship("Employee", back_populates="attendance_logs")


Index("idx_attendance_logs_date", AttendanceLog.check_time)


class Timesheet(Base):
    __tablename__ = "timesheets"
    __table_args__ = (
        UniqueConstraint("employee_id", "work_date", name="uq_timesheets_employee_work_date"),
    )

    timesheet_id = Column(BigInteger, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False)

    work_date = Column(Date, nullable=False)
    check_in_time = Column(Time)
    check_out_time = Column(Time)

    working_hours = Column(Float, server_default=text("0"), nullable=False)
    paid_work_day = Column(Float, server_default=text("0"), nullable=False)

    status = Column(
        SAEnum(TimesheetStatusEnum, name="timesheet_status_enum"),
        server_default=text("'ABSENT'::timesheet_status_enum"),
        nullable=False,
    )

    note = Column(Text)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    employee = relationship("Employee", back_populates="timesheets")


Index("idx_timesheets_date", Timesheet.work_date)


class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    __table_args__ = (
        UniqueConstraint("employee_id", "year", name="uq_leave_balances_employee_year"),
    )

    balance_id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False)

    year = Column(Integer, nullable=False)

    total_entitlement = Column(Float, server_default=text("12"), nullable=False)
    used = Column(Float, server_default=text("0"), nullable=False)

    # remaining FLOAT GENERATED ALWAYS AS (total_entitlement - used) STORED
    remaining = Column(Float, Computed("total_entitlement - used", persisted=True))

    employee = relationship("Employee", back_populates="leave_balances")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    request_id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    leave_type = Column(
        SAEnum(LeaveTypeEnum, name="leave_type_enum"),
        server_default=text("'PAID'::leave_type_enum"),
        nullable=False,
    )

    reason = Column(Text)

    status = Column(
        SAEnum(LeaveStatusEnum, name="leave_status_enum"),
        server_default=text("'PENDING'::leave_status_enum"),
        nullable=False,
    )

    approver_id = Column(Integer, ForeignKey("employees.employee_id"))
    rejection_reason = Column(Text)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="leave_requests")
    approver = relationship("Employee", foreign_keys=[approver_id], back_populates="leave_requests_to_approve")


Index("idx_leave_requests_employee", LeaveRequest.employee_id)


class SalaryContract(Base):
    __tablename__ = "salary_contracts"

    contract_id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False)

    base_salary = Column(Numeric(15, 2), nullable=False)
    allowance = Column(Numeric(15, 2), server_default=text("0"), nullable=False)
    insurance_salary = Column(Numeric(15, 2))

    effective_date = Column(Date, nullable=False)
    is_active = Column(Boolean, server_default=text("TRUE"), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    employee = relationship("Employee", back_populates="salary_contracts")


class Payslip(Base):
    __tablename__ = "payslips"
    __table_args__ = (
        UniqueConstraint("employee_id", "month", "year", name="uq_payslips_employee_month_year"),
    )

    payslip_id = Column(BigInteger, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False)

    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)

    standard_work_days = Column(Float)
    actual_work_days = Column(Float)
    leave_paid_days = Column(Float)

    gross_salary = Column(Numeric(15, 2))

    tax_deduction = Column(Numeric(15, 2), server_default=text("0"), nullable=False)
    insurance_deduction = Column(Numeric(15, 2), server_default=text("0"), nullable=False)
    advance_payment = Column(Numeric(15, 2), server_default=text("0"), nullable=False)

    net_salary = Column(Numeric(15, 2))
    status = Column(Boolean, server_default=text("FALSE"), nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    employee = relationship("Employee", back_populates="payslips")