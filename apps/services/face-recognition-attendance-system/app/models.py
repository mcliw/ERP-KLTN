from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# ==========================================
# 1. Bảng DEPARTMENTS (Phòng ban)
# ==========================================
class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # VARCHAR(100)

    # Quan hệ: Một phòng ban có nhiều nhân viên
    # back_populates="department" trỏ đến thuộc tính 'department' ở class Employee
    employees = relationship("Employee", back_populates="department")


# ==========================================
# 2. Bảng EMPLOYEES (Nhân viên)
# ==========================================
class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    # Khóa ngoại trỏ về departments.id
    # ondelete="SET NULL": Nếu xóa phòng ban, department_id của NV sẽ về NULL
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    
    name = Column(String(100), nullable=False)
    position = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Quan hệ ngược lại: Một nhân viên thuộc về một phòng ban
    department = relationship("Department", back_populates="employees")

    # Quan hệ: Một nhân viên có nhiều bản ghi chấm công
    # cascade="all, delete-orphan": Nếu xóa nhân viên, xóa luôn các dòng chấm công của họ
    attendance_logs = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")


# ==========================================
# 3. Bảng ATTENDANCE (Chấm công)
# ==========================================
class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    # Khóa ngoại trỏ về employees.id
    # ondelete="CASCADE": Xóa nhân viên thì xóa luôn log chấm công
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    check_time = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="check-in")  # check-in, check-out
    device_id = Column(String(50), nullable=True)

    # Quan hệ ngược lại: Mỗi dòng chấm công thuộc về 1 nhân viên
    employee = relationship("Employee", back_populates="attendance_logs")


# ==========================================
# 4. Bảng USERS (Quản trị viên - Admin)
# ==========================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True) # VARCHAR(50) UNIQUE
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="admin") # admin, hr, viewer