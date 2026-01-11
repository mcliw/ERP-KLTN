# scripts/seed_hrm.py
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from app.db.hrm_database import HrmSessionLocal, engine, HrmBase
from app.modules.hrm.models import (
    Department, Position, Employee,
    WorkShift, TimesheetDaily, AttendanceLog,
    LeaveRequest, OTRequest, LaborContract,
    SalaryRule, PayrollPeriod, Payslip, PayslipDetail,
    EmployeeFaceData, PaymentRequestHRM,
)

def _d(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()

def _dt(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")

def seed_hrm(reset: bool = False):
    if reset:
        HrmBase.metadata.drop_all(bind=engine)
        HrmBase.metadata.create_all(bind=engine)

    db = HrmSessionLocal()
    try:
        # 1) Department (10)
        if db.query(Department).count() < 10:
            db.query(Department).delete()
            deps = [
                Department(code=f"DP{str(i).zfill(3)}", name=f"Phòng {i}", description=f"Mô tả phòng {i}")
                for i in range(1, 11)
            ]
            db.add_all(deps)
            db.flush()

        # 2) Position (10)
        if db.query(Position).count() < 10:
            db.query(Position).delete()
            pos = []
            for i in range(1, 11):
                pos.append(Position(
                    title=f"Chức vụ {i}",
                    base_salary_range_min=Decimal(8000000 + i * 300000),
                    base_salary_range_max=Decimal(15000000 + i * 500000),
                    description=f"Mô tả chức vụ {i}",
                ))
            db.add_all(pos)
            db.flush()

        # Reload for FK ids
        deps = db.query(Department).order_by(Department.id.asc()).all()
        pos = db.query(Position).order_by(Position.id.asc()).all()

        # 3) Employee (10)
        if db.query(Employee).count() < 10:
            db.query(Employee).delete()
            employees = []
            for i in range(1, 11):
                employees.append(Employee(
                    user_id=1000 + i,
                    employee_code=f"NV{str(i).zfill(3)}",
                    full_name=f"Nhân Viên {i}",
                    department_id=deps[(i - 1) % 10].id,
                    position_id=pos[(i - 1) % 10].id,
                    dob=_d(f"199{(i%10)}-0{(i%9)+1}-15"),
                    gender="MALE" if i % 3 == 1 else ("FEMALE" if i % 3 == 2 else "OTHER"),
                    phone=f"0900000{str(i).zfill(3)}",
                    email_company=f"nv{str(i).zfill(3)}@company.local",
                    address=f"Địa chỉ {i}",
                    identity_card=f"0{str(100000000 + i)}",
                    bank_account_number=f"12345678{str(i).zfill(2)}",
                    bank_name="Vietcombank",
                    status="ACTIVE" if i <= 9 else "INACTIVE",
                    join_date=_d("2024-01-01") + timedelta(days=i * 7),
                    resign_date=None if i <= 9 else _d("2025-12-01"),
                ))
            db.add_all(employees)
            db.flush()

        employees = db.query(Employee).order_by(Employee.id.asc()).all()

        # 4) WorkShift (10)
        if db.query(WorkShift).count() < 10:
            db.query(WorkShift).delete()
            shifts = []
            base = [
                ("Ca Hành chính", time(8, 0, 0), time(17, 0, 0), time(12, 0, 0), time(13, 0, 0)),
                ("Ca Sáng",      time(7, 30, 0), time(15, 30, 0), time(11, 30, 0), time(12, 30, 0)),
                ("Ca Chiều",     time(13, 0, 0), time(21, 0, 0), time(17, 0, 0), time(18, 0, 0)),
            ]
            for i in range(1, 11):
                name, st, en, bs, be = base[(i - 1) % len(base)]
                shifts.append(WorkShift(
                    shift_name=f"{name} #{i}",
                    start_time=st,
                    end_time=en,
                    break_start_time=bs,
                    break_end_time=be,
                ))
            db.add_all(shifts)
            db.flush()

        shifts = db.query(WorkShift).order_by(WorkShift.id.asc()).all()

        # 5) TimesheetDaily (10)
        if db.query(TimesheetDaily).count() < 10:
            db.query(TimesheetDaily).delete()
            today = date.today()
            rows = []
            for i in range(10):
                emp = employees[i % 10]
                sh = shifts[i % 10]
                dday = today - timedelta(days=i)
                status = "PRESENT" if i <= 6 else ("LEAVE" if i == 7 else "ABSENT")
                rows.append(TimesheetDaily(
                    employee_id=emp.id,
                    date=dday,
                    work_shift_id=sh.id,
                    check_in_time=time(8, 5, 0) if status == "PRESENT" else None,
                    check_out_time=time(17, 0, 0) if status == "PRESENT" else None,
                    late_minutes=5 if status == "PRESENT" else 0,
                    early_leave_minutes=0,
                    ot_hours=1.5 if i % 4 == 0 else 0.0,
                    status=status,
                    working_day_count=1.0 if status == "PRESENT" else (0.0 if status == "ABSENT" else 1.0),
                    note="Seed dữ liệu",
                ))
            db.add_all(rows)
            db.flush()

        # 6) AttendanceLog (10)
        if db.query(AttendanceLog).count() < 10:
            db.query(AttendanceLog).delete()
            logs = []
            now = datetime.now()
            for i in range(10):
                emp = employees[i % 10]
                logs.append(AttendanceLog(
                    employee_id=emp.id,
                    check_time=now - timedelta(hours=i * 3),
                    image_snapshot=f"/snapshots/{emp.employee_code}_{i}.jpg",
                    confidence_score=0.92 - i * 0.01,
                    device_id=f"DEV-{str((i%3)+1).zfill(2)}",
                ))
            db.add_all(logs)
            db.flush()

        # 7) LeaveRequest (10)
        if db.query(LeaveRequest).count() < 10:
            db.query(LeaveRequest).delete()
            base_dt = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            reqs = []
            for i in range(10):
                emp = employees[i % 10]
                from_dt = base_dt + timedelta(days=i * 2)
                to_dt = from_dt + timedelta(days=1)
                reqs.append(LeaveRequest(
                    employee_id=emp.id,
                    leave_type="ANNUAL" if i % 3 == 0 else ("SICK" if i % 3 == 1 else "UNPAID"),
                    from_date=from_dt,
                    to_date=to_dt,
                    total_days=1.0,
                    reason=f"Lý do nghỉ {i+1}",
                    status="APPROVED" if i <= 5 else ("PENDING" if i <= 8 else "REJECTED"),
                    approver_id=employees[0].id,
                    approved_at=from_dt + timedelta(hours=4) if i <= 5 else None,
                ))
            db.add_all(reqs)
            db.flush()

        # 8) OTRequest (10)
        if db.query(OTRequest).count() < 10:
            db.query(OTRequest).delete()
            today = date.today()
            ots = []
            for i in range(10):
                emp = employees[i % 10]
                ots.append(OTRequest(
                    employee_id=emp.id,
                    ot_date=today - timedelta(days=i),
                    from_time=time(18, 0, 0),
                    to_time=time(20, 0, 0),
                    total_hours=2.0,
                    ot_type="WEEKDAY" if i % 3 != 0 else "WEEKEND",
                    reason=f"Tăng ca dự án {i+1}",
                    status="APPROVED" if i <= 6 else ("PENDING" if i <= 8 else "REJECTED"),
                    approver_id=employees[0].id,
                ))
            db.add_all(ots)
            db.flush()

        # 9) LaborContract (10)
        if db.query(LaborContract).count() < 10:
            db.query(LaborContract).delete()
            contracts = []
            for i in range(10):
                emp = employees[i % 10]
                start = _d("2024-01-01") + timedelta(days=i * 10)
                end = _d("2026-12-31") if i <= 7 else _d("2025-06-30")
                status = "ACTIVE" if i <= 7 else "EXPIRED"
                contracts.append(LaborContract(
                    employee_id=emp.id,
                    contract_number=f"HD-{emp.employee_code}-01",
                    contract_type="FIXED" if i % 2 == 0 else "UNLIMITED",
                    start_date=start,
                    end_date=end,
                    basic_salary=Decimal(12000000 + i * 700000),
                    allowance_responsibility=Decimal(500000 + i * 50000),
                    allowance_transport=Decimal(300000),
                    allowance_lunch=Decimal(600000),
                    file_path=f"/contracts/{emp.employee_code}.pdf",
                    status=status,
                ))
            db.add_all(contracts)
            db.flush()

        # 10) SalaryRule (10)
        if db.query(SalaryRule).count() < 10:
            db.query(SalaryRule).delete()
            rules = []
            for i in range(1, 11):
                rules.append(SalaryRule(
                    code=f"SR{str(i).zfill(3)}",
                    name=f"Quy tắc {i}",
                    type="ALLOWANCE" if i <= 5 else "DEDUCTION",
                    formula="FIXED" if i <= 5 else "PERCENT",
                    is_active=True,
                ))
            db.add_all(rules)
            db.flush()

        rules = db.query(SalaryRule).order_by(SalaryRule.id.asc()).all()

        # 11) PayrollPeriod (10) - 10 tháng gần nhất
        if db.query(PayrollPeriod).count() < 10:
            db.query(PayrollPeriod).delete()
            today = date.today()
            periods = []
            for i in range(10):
                m = (today.month - i)
                y = today.year
                while m <= 0:
                    m += 12
                    y -= 1
                periods.append(PayrollPeriod(
                    name=f"Kỳ lương {m:02d}/{y}",
                    month=m,
                    year=y,
                    start_date=date(y, m, 1),
                    end_date=(date(y, m, 28) + timedelta(days=4)).replace(day=1) - timedelta(days=1),
                    standard_working_days=26,
                    status="OPEN" if i == 0 else "CLOSED",
                ))
            db.add_all(periods)
            db.flush()

        periods = db.query(PayrollPeriod).order_by(PayrollPeriod.year.desc(), PayrollPeriod.month.desc()).all()
        current_period = periods[0]

        # 12) Payslip (10) - cho kỳ gần nhất
        if db.query(Payslip).count() < 10:
            db.query(Payslip).delete()
            payslips = []
            for i in range(10):
                emp = employees[i % 10]
                gross = Decimal(15000000 + i * 500000)
                ded = Decimal(800000 + i * 20000)
                net = gross - ded
                payslips.append(Payslip(
                    payroll_period_id=current_period.id,
                    employee_id=emp.id,
                    total_working_days=26.0,
                    total_ot_hours=float((i % 4) * 2),
                    gross_salary=gross,
                    total_deduction=ded,
                    net_salary=net,
                    status="FINAL" if i <= 8 else "DRAFT",
                ))
            db.add_all(payslips)
            db.flush()

        payslips = db.query(Payslip).order_by(Payslip.id.asc()).all()

        # 13) PayslipDetail (>=10, tạo 3 dòng/payslip => 30)
        if db.query(PayslipDetail).count() < 10:
            db.query(PayslipDetail).delete()
            details = []
            # dùng 3 rule đầu: 2 allowance + 1 deduction (nếu đủ)
            pick = rules[:3] if len(rules) >= 3 else rules
            for ps in payslips[:10]:
                for j, r in enumerate(pick, start=1):
                    amt = Decimal(500000 * j) if r.type == "ALLOWANCE" else Decimal(200000 * j)
                    details.append(PayslipDetail(
                        payslip_id=ps.id,
                        salary_rule_id=r.id,
                        amount=amt,
                        note=f"Chi tiết {r.code}",
                    ))
            db.add_all(details)
            db.flush()

        # 14) EmployeeFaceData (10)
        if db.query(EmployeeFaceData).count() < 10:
            db.query(EmployeeFaceData).delete()
            fds = []
            for i in range(10):
                emp = employees[i % 10]
                fds.append(EmployeeFaceData(
                    employee_id=emp.id,
                    face_vector={"v": [round(0.01 * (k + i), 4) for k in range(8)]},
                    image_path=f"/faces/{emp.employee_code}.jpg",
                    is_active=True if i <= 6 else False,
                ))
            db.add_all(fds)
            db.flush()

        # 15) PaymentRequestHRM (10) - gắn theo 10 kỳ lương
        if db.query(PaymentRequestHRM).count() < 10:
            db.query(PaymentRequestHRM).delete()
            prs = []
            for i, p in enumerate(periods[:10], start=1):
                prs.append(PaymentRequestHRM(
                    payroll_period_id=p.id,
                    request_code=f"PAY-HRM-{p.year}{p.month:02d}",
                    total_amount=Decimal(150000000 + i * 5000000),
                    total_employees=10,
                    status="PENDING" if i == 1 else ("PAID" if i >= 6 else "SENT"),
                    finance_transaction_id=10000 + i,
                    created_by=employees[0].id,
                ))
            db.add_all(prs)
            db.flush()

        db.commit()
        print("Seed HRM OK (10 rows/table).")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # reset=True nếu bạn muốn xóa & tạo lại toàn bộ bảng HRM trước khi seed
    seed_hrm(reset=True)
