import argparse
import os
import sys
from datetime import datetime, date, time, timedelta
from decimal import Decimal

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# ========= HRM =========
from app.db.hrm_database import HrmBase, engine as hrm_engine, HrmSessionLocal
from app.modules.hrm.models import (
    Department, Position, Employee, WorkShift, TimesheetDaily, AttendanceLog,
    LeaveRequest, OTRequest, LaborContract, SalaryRule, PayrollPeriod,
    Payslip, PayslipDetail, EmployeeFaceData, PaymentRequestHRM
)

# ========= SALE & CRM =========
from app.db.sale_crm_database import SaleCrmBase, engine as sale_engine, SaleCrmSessionLocal
from app.modules.sale_crm.models import (
    Role, User, Address, Brand, Product as SaleProduct, ProductVariant,
    Payment, Order, OrderDetail, Review, Voucher, VoucherDetail,
    VoucherConstraint, ImgReview
)

# ========= FINANCE & ACCOUNTING =========
from app.db.finance_database import FinanceBase, engine as fin_engine, FinanceSessionLocal
from app.modules.finance_accounting.models import (
    BusinessPartner, FiscalPeriod, JournalEntry, ChartOfAccounts,
    JournalEntryLine, ARInvoice, APInvoice, CashTransaction, PostingRule
)

# ========= SUPPLY CHAIN =========
from app.db.supply_chain_database import SupplyChainBase, engine as sc_engine, SupplyChainSessionLocal
from app.modules.supply_chain.models import (
    Warehouse, BinLocation, ProductCategory, Product as ScProduct, Supplier,
    PurchaseRequest, PRItem, Quotation, PurchaseOrder, POItem,
    GoodsReceipt, GRItem, GoodsIssue, GIItem,
    CurrentStock, InventoryTransactionLog, Stocktake, StocktakeDetail, PurchaseReturn
)


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--reset", action="store_true", help="Drop & create all tables before seeding")
    return p.parse_args()


def create_tables(reset: bool):
    modules = [
        ("HRM", HrmBase, hrm_engine),
        ("SALE_CRM", SaleCrmBase, sale_engine),
        ("FINANCE", FinanceBase, fin_engine),
        ("SUPPLY_CHAIN", SupplyChainBase, sc_engine),
    ]
    for name, base, eng in modules:
        if reset:
            base.metadata.drop_all(bind=eng)
        base.metadata.create_all(bind=eng)
        print(f"[OK] Tables ready: {name}")


# =========================
# SEED HELPERS
# =========================
def d(num: str) -> Decimal:
    return Decimal(num)


def seed_hrm():
    session = HrmSessionLocal()
    try:
        # Departments
        departments = []
        for i in range(1, 11):
            departments.append(Department(
                code=f"DPT{i:03d}",
                name=f"Phòng {i}",
                description=f"Phòng ban số {i}",
                created_at=datetime.utcnow()
            ))
        session.add_all(departments)
        session.flush()

        # Positions
        positions = []
        for i in range(1, 11):
            positions.append(Position(
                title=f"Chức danh {i}",
                base_salary_range_min=d(str(8000000 + i * 500000)),
                base_salary_range_max=d(str(15000000 + i * 800000)),
                description=f"Mô tả chức danh {i}"
            ))
        session.add_all(positions)
        session.flush()

        # Employees
        genders = ["MALE", "FEMALE", "OTHER"]
        statuses = ["ACTIVE", "INACTIVE"]
        employees = []
        for i in range(1, 11):
            employees.append(Employee(
                user_id=1000 + i,
                employee_code=f"EMP{i:04d}",
                full_name=f"Nhân Viên {i}",
                department_id=departments[(i - 1) % len(departments)].id,
                position_id=positions[(i - 1) % len(positions)].id,
                dob=date(1998, (i % 12) + 1, (i % 28) + 1),
                gender=genders[i % len(genders)],
                phone=f"09{(10_000_000 + i*12345) % 100_000_000:08d}",
                email_company=f"nv{i}@company.local",
                address=f"Số {i} Đường ABC, Quận {(i%10)+1}",
                identity_card=f"0{(100000000 + i*9999)}",
                bank_account_number=f"{123456789000 + i}",
                bank_name="Vietcombank" if i % 2 == 0 else "Techcombank",
                status=statuses[i % len(statuses)],
                join_date=date(2022, (i % 12) + 1, (i % 28) + 1),
                resign_date=None if i % 4 != 0 else date(2025, 12, (i % 28) + 1),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ))
        session.add_all(employees)
        session.flush()

        # Work shifts
        shifts = []
        for i in range(1, 11):
            start_h = 8 + (i % 3) * 2
            shifts.append(WorkShift(
                shift_name=f"Ca {i}",
                start_time=time(start_h, 0),
                end_time=time(start_h + 8, 0),
                break_start_time=time(start_h + 4, 0),
                break_end_time=time(start_h + 5, 0),
            ))
        session.add_all(shifts)
        session.flush()

        # TimesheetDaily
        ts_status = ["PRESENT", "ABSENT", "LEAVE"]
        timesheets = []
        base_day = date.today() - timedelta(days=15)
        for i in range(1, 11):
            emp = employees[(i - 1) % len(employees)]
            sh = shifts[(i - 1) % len(shifts)]
            day = base_day + timedelta(days=i)
            status = ts_status[i % len(ts_status)]
            check_in = datetime.combine(day, time(8, 5)) if status == "PRESENT" else None
            check_out = datetime.combine(day, time(17, 10)) if status == "PRESENT" else None
            timesheets.append(TimesheetDaily(
                employee_id=emp.id,
                date=day,
                work_shift_id=sh.id,
                check_in_time=check_in,
                check_out_time=check_out,
                late_minutes=5 if status == "PRESENT" else 0,
                early_leave_minutes=0,
                ot_hours=float(i % 3),
                status=status,
                working_day_count=1.0 if status == "PRESENT" else 0.0,
                note="Seed data"
            ))
        session.add_all(timesheets)
        session.flush()

        # AttendanceLog
        logs = []
        for i in range(1, 11):
            emp = employees[(i - 1) % len(employees)]
            logs.append(AttendanceLog(
                employee_id=emp.id,
                check_time=datetime.utcnow() - timedelta(hours=i),
                image_snapshot=f"/snapshots/{emp.employee_code}_{i}.jpg",
                confidence_score=float(0.85 + (i % 10) / 100),
                device_id=f"CAM-{(i%3)+1}",
                created_at=datetime.utcnow()
            ))
        session.add_all(logs)
        session.flush()

        # LeaveRequest
        leave_types = ["ANNUAL", "SICK", "UNPAID"]
        leave_status = ["PENDING", "APPROVED", "REJECTED"]
        leave_reqs = []
        for i in range(1, 11):
            emp = employees[(i - 1) % len(employees)]
            leave_reqs.append(LeaveRequest(
                employee_id=emp.id,
                leave_type=leave_types[i % len(leave_types)],
                from_date=date.today() + timedelta(days=i),
                to_date=date.today() + timedelta(days=i + 1),
                total_days=float(1.0),
                reason=f"Nghỉ phép lý do {i}",
                status=leave_status[i % len(leave_status)],
                approver_id=employees[0].id,
                approved_at=datetime.utcnow() if i % 3 == 1 else None,
            ))
        session.add_all(leave_reqs)
        session.flush()

        # OTRequest
        ot_types = ["WEEKDAY", "WEEKEND", "HOLIDAY"]
        ot_status = ["PENDING", "APPROVED", "REJECTED"]
        ot_reqs = []
        for i in range(1, 11):
            emp = employees[(i - 1) % len(employees)]
            ot_reqs.append(OTRequest(
                employee_id=emp.id,
                ot_date=date.today() - timedelta(days=i),
                from_time=time(18, 0),
                to_time=time(20, 0),
                total_hours=float(2.0),
                ot_type=ot_types[i % len(ot_types)],
                reason=f"Tăng ca {i}",
                status=ot_status[i % len(ot_status)],
                approver_id=employees[0].id,
            ))
        session.add_all(ot_reqs)
        session.flush()

        # LaborContract
        ct_types = ["FIXED", "UNLIMITED"]
        ct_status = ["ACTIVE", "EXPIRED"]
        contracts = []
        for i in range(1, 11):
            emp = employees[(i - 1) % len(employees)]
            contracts.append(LaborContract(
                employee_id=emp.id,
                contract_number=f"HDLD-{2024}-{i:04d}",
                contract_type=ct_types[i % len(ct_types)],
                start_date=date(2024, 1, 1),
                end_date=None if i % 2 == 0 else date(2025, 12, 31),
                basic_salary=d(str(10000000 + i * 700000)),
                allowance_responsibility=d(str(500000 + i * 20000)),
                allowance_transport=d("300000"),
                allowance_lunch=d("500000"),
                file_path=f"/contracts/{emp.employee_code}.pdf",
                status=ct_status[i % len(ct_status)],
                created_at=datetime.utcnow()
            ))
        session.add_all(contracts)
        session.flush()

        # SalaryRule
        rule_types = ["ALLOWANCE", "DEDUCTION"]
        rules = []
        for i in range(1, 11):
            rules.append(SalaryRule(
                code=f"SR{i:03d}",
                name=f"Quy tắc lương {i}",
                type=rule_types[i % len(rule_types)],
                formula="AMOUNT" if i % 2 == 0 else "AMOUNT * 0.1",
                is_active=True if i % 5 != 0 else False
            ))
        session.add_all(rules)
        session.flush()

        # PayrollPeriod
        pp_status = ["OPEN", "CLOSED"]
        periods = []
        for i in range(1, 11):
            m = ((i - 1) % 12) + 1
            periods.append(PayrollPeriod(
                name=f"Kỳ lương {m}/2025",
                month=m,
                year=2025,
                start_date=date(2025, m, 1),
                end_date=date(2025, m, 28),
                standard_working_days=float(22),
                status=pp_status[i % len(pp_status)],
                created_at=datetime.utcnow()
            ))
        session.add_all(periods)
        session.flush()

        # Payslip + PayslipDetail
        payslip_status = ["DRAFT", "FINAL"]
        payslips = []
        payslip_details = []
        for i in range(1, 11):
            emp = employees[(i - 1) % len(employees)]
            period = periods[(i - 1) % len(periods)]
            gross = d(str(12000000 + i * 600000))
            ded = d(str(500000 + i * 30000))
            net = gross - ded
            ps = Payslip(
                payroll_period_id=period.id,
                employee_id=emp.id,
                total_working_days=float(22 - (i % 3)),
                total_ot_hours=float(i % 10) / 2,
                gross_salary=gross,
                total_deduction=ded,
                net_salary=net,
                status=payslip_status[i % len(payslip_status)],
                created_at=datetime.utcnow()
            )
            payslips.append(ps)
        session.add_all(payslips)
        session.flush()

        payslip_details = []
        for i in range(1, 11):
            ps = payslips[(i - 1) % len(payslips)]
            rule = rules[(i - 1) % len(rules)]
            payslip_details.append(PayslipDetail(
                payslip_id=ps.id,
                salary_rule_id=rule.id,
                amount=d(str(200000 + i * 50000)),
                note="Seed detail"
            ))
        session.add_all(payslip_details)
        session.flush()

        # EmployeeFaceData
        face_data = []
        for i in range(1, 11):
            emp = employees[(i - 1) % len(employees)]
            face_data.append(EmployeeFaceData(
                employee_id=emp.id,
                face_vector={"embedding": [round(0.01 * j, 4) for j in range(1, 6)]},
                image_path=f"/faces/{emp.employee_code}.jpg",
                is_active=True,
                created_at=datetime.utcnow()
            ))
        session.add_all(face_data)
        session.flush()

        # PaymentRequestHRM
        pr_status = ["PENDING", "SENT", "PAID"]
        pay_reqs = []
        for i in range(1, 11):
            period = periods[(i - 1) % len(periods)]
            pay_reqs.append(PaymentRequestHRM(
                payroll_period_id=period.id,
                request_code=f"PRHRM-{period.month:02d}{period.year}-{i:03d}",
                total_amount=d(str(200000000 + i * 5000000)),
                total_employees=int(10 + i),
                status=pr_status[i % len(pr_status)],
                finance_transaction_id=10000 + i,
                created_by=employees[0].id,
                created_at=datetime.utcnow()
            ))
        session.add_all(pay_reqs)

        session.commit()
        print("[OK] Seed HRM done.")
    finally:
        session.close()


def seed_sale_crm():
    session = SaleCrmSessionLocal()
    try:
        # Roles
        role_names = ["ADMIN", "SALES", "CSKH", "CUSTOMER", "MANAGER"]
        roles = [Role(role_name=r) for r in role_names]
        session.add_all(roles)
        session.flush()

        # Users
        users = []
        for i in range(1, 11):
            users.append(User(
                role_id=roles[(i - 1) % len(roles)].id,
                username=f"user{i}",
                email=f"user{i}@mail.local",
                phone=f"09{(20_000_000 + i*22222) % 100_000_000:08d}",
                password="hashed_password",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ))
        session.add_all(users)
        session.flush()

        # Addresses
        addresses = []
        for i in range(1, 11):
            u = users[i - 1]
            addresses.append(Address(
                user_id=u.id,
                city="Hà Nội" if i % 2 == 0 else "TP.HCM",
                district=f"Quận {(i%12)+1}",
                ward=f"Phường {(i%20)+1}",
                street_address=f"{i} Nguyễn Trãi",
                is_default=True if i % 3 == 0 else False
            ))
        session.add_all(addresses)
        session.flush()

        # Brands
        brands = []
        for i in range(1, 11):
            brands.append(Brand(
                name=["Apple", "Samsung", "Xiaomi", "Sony", "Asus", "Dell", "HP", "Lenovo", "Acer", "Logitech"][i-1],
                description=f"Thương hiệu {i}",
                is_active=True,
                created_at=datetime.utcnow()
            ))
        session.add_all(brands)
        session.flush()

        # Products
        products = []
        for i in range(1, 11):
            products.append(SaleProduct(
                brand_id=brands[(i - 1) % len(brands)].id,
                name=f"Sản phẩm {i}",
                description=f"Mô tả sản phẩm {i}",
                avg_rating=float(3.5 + (i % 5) * 0.3),
                total_sold=int(50 * i),
                total_stock=int(100 + 10 * i),
                is_active=True
            ))
        session.add_all(products)
        session.flush()

        # Product variants
        variants = []
        for i in range(1, 11):
            variants.append(ProductVariant(
                product_id=products[(i - 1) % len(products)].id,
                name=f"Variant {i}",
                stock=int(20 + i),
                sold=int(i),
                original_price=d(str(1000000 + i * 250000)),
                discount_amount=d(str((i % 4) * 50000)),
                discount_percent=float((i % 5) * 5.0)
            ))
        session.add_all(variants)
        session.flush()

        # Payments
        payments = []
        pay_status = ["PENDING", "PAID", "FAILED"]
        pay_method = ["COD", "BANK_TRANSFER", "MOMO"]
        for i in range(1, 11):
            payments.append(Payment(
                amount=d(str(1500000 + i * 300000)),
                payment_status=pay_status[i % len(pay_status)],
                payment_method=pay_method[i % len(pay_method)],
                transaction_id=f"TX-{2025}{i:04d}",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ))
        session.add_all(payments)
        session.flush()

        # Orders
        order_status = ["NEW", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"]
        orders = []
        for i in range(1, 11):
            u = users[(i - 1) % len(users)]
            pay = payments[(i - 1) % len(payments)]
            orders.append(Order(
                user_id=u.id,
                payment_id=pay.id,
                order_status=order_status[i % len(order_status)],
                payment_method=pay.payment_method,
                shipping_address=f"{i} Nguyễn Trãi, {addresses[(i - 1) % len(addresses)].district}",
                created_at=datetime.utcnow() - timedelta(days=i)
            ))
        session.add_all(orders)
        session.flush()

        # Order details
        details = []
        for i in range(1, 11):
            details.append(OrderDetail(
                order_id=orders[(i - 1) % len(orders)].id,
                product_variant_id=variants[(i - 1) % len(variants)].id,
                quantity=int((i % 3) + 1),
                price=d(str(1200000 + i * 150000))
            ))
        session.add_all(details)
        session.flush()

        # Reviews
        reviews = []
        for i in range(1, 11):
            reviews.append(Review(
                product_id=products[(i - 1) % len(products)].id,
                user_id=users[(i - 1) % len(users)].id,
                content=f"Đánh giá sản phẩm {i}",
                rating=int((i % 5) + 1),
                created_at=datetime.utcnow() - timedelta(days=i)
            ))
        session.add_all(reviews)
        session.flush()

        # Img reviews
        imgs = []
        for i in range(1, 11):
            imgs.append(ImgReview(
                review_id=reviews[(i - 1) % len(reviews)].id,
                image_url=f"https://img.local/review_{i}.jpg",
                created_at=datetime.utcnow()
            ))
        session.add_all(imgs)
        session.flush()

        # Vouchers
        discount_type = ["PERCENT", "AMOUNT"]
        vouchers = []
        for i in range(1, 11):
            vouchers.append(Voucher(
                name=f"Voucher {i}",
                description=f"Khuyến mãi {i}",
                discount_type=discount_type[i % len(discount_type)],
                discount_value=float(5 + (i % 6) * 5) if i % 2 == 0 else float(50000 + i * 10000),
                start_date=date.today() - timedelta(days=10),
                end_date=date.today() + timedelta(days=30),
                is_active=True,
                created_at=datetime.utcnow()
            ))
        session.add_all(vouchers)
        session.flush()

        # Voucher details & constraints
        vdetails = []
        vconstraints = []
        for i in range(1, 11):
            v = vouchers[i - 1]
            vdetails.append(VoucherDetail(
                voucher_id=v.id,
                code=f"VC{i:04d}",
                usage_limit=int(100 + i * 10),
                used_count=int(i * 2),
                is_active=True
            ))
            vconstraints.append(VoucherConstraint(
                voucher_id=v.id,
                min_order_amount=d(str(500000 + i * 100000)),
                max_discount_amount=d(str(200000 + i * 20000)),
                is_new_customer_only=True if i % 3 == 0 else False
            ))
        session.add_all(vdetails)
        session.add_all(vconstraints)

        session.commit()
        print("[OK] Seed Sale & CRM done.")
    finally:
        session.close()


def seed_finance():
    session = FinanceSessionLocal()
    try:
        # Partners
        partner_types = ["CUSTOMER", "SUPPLIER"]
        partners = []
        for i in range(1, 11):
            partners.append(BusinessPartner(
                partner_type=partner_types[i % 2],
                external_id=f"EXT{i:04d}",
                partner_name=f"Đối tác {i}",
                tax_code=f"TX{i:05d}",
                contact_info={"email": f"partner{i}@mail.local", "phone": f"090{i:07d}"},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ))
        session.add_all(partners)
        session.flush()

        # Fiscal periods
        fp_status = ["OPEN", "CLOSED"]
        fiscal_periods = []
        for i in range(1, 5):
            fiscal_periods.append(FiscalPeriod(
                period_name=f"FY2025-Q{i}",
                start_date=date(2025, (i - 1) * 3 + 1, 1),
                end_date=date(2025, i * 3, 28),
                status=fp_status[i % len(fp_status)]
            ))
        session.add_all(fiscal_periods)
        session.flush()

        # Chart of accounts
        acct_types = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]
        accounts = []
        for i in range(1, 11):
            accounts.append(ChartOfAccounts(
                account_code=f"{1000+i}",
                account_name=f"Tài khoản {i}",
                account_type=acct_types[i % len(acct_types)],
                parent_account_id=None,
                is_active=True,
                created_at=datetime.utcnow()
            ))
        session.add_all(accounts)
        session.flush()

        # Journal entries
        src_modules = ["SALES", "PURCHASE", "CASH", "MANUAL"]
        je_status = ["DRAFT", "POSTED"]
        entries = []
        for i in range(1, 11):
            entries.append(JournalEntry(
                transaction_date=date.today() - timedelta(days=i),
                posting_date=date.today() - timedelta(days=i),
                reference_no=f"JE-{2025}{i:04d}",
                description=f"Bút toán {i}",
                source_module=src_modules[i % len(src_modules)],
                status=je_status[i % len(je_status)],
                fiscal_period_id=fiscal_periods[i % len(fiscal_periods)].period_id,
                total_amount=d(str(1000000 + i * 250000)),
                created_by=9000 + i
            ))
        session.add_all(entries)
        session.flush()

        # Journal entry lines (>= 10)
        lines = []
        for i in range(1, 21):
            e = entries[(i - 1) % len(entries)]
            acc = accounts[(i - 1) % len(accounts)]
            partner = partners[(i - 1) % len(partners)]
            debit = d(str(200000 + i * 10000)) if i % 2 == 0 else d("0")
            credit = d(str(200000 + i * 10000)) if i % 2 == 1 else d("0")
            lines.append(JournalEntryLine(
                entry_id=e.entry_id,
                account_id=acc.account_id,
                partner_id=partner.partner_id,
                debit_amount=debit,
                credit_amount=credit,
                description=f"Dòng {i}"
            ))
        session.add_all(lines)
        session.flush()

        # AR invoices (customer)
        ar_status = ["UNPAID", "PARTIAL", "PAID"]
        ar = []
        for i in range(1, 11):
            cust = partners[(i - 1) % len(partners)]
            ar.append(ARInvoice(
                partner_id=cust.partner_id,
                sales_order_ref=f"SO-{2025}{i:04d}",
                invoice_date=date.today() - timedelta(days=20 - i),
                due_date=date.today() + timedelta(days=15),
                total_amount=d(str(5000000 + i * 300000)),
                received_amount=d(str(1000000 + i * 100000)) if i % 3 == 0 else d("0"),
                payment_status=ar_status[i % len(ar_status)],
                entry_id=entries[(i - 1) % len(entries)].entry_id
            ))
        session.add_all(ar)
        session.flush()

        # AP invoices (supplier)
        ap_status = ["UNPAID", "PARTIAL", "PAID"]
        ap = []
        for i in range(1, 11):
            sup = partners[(i - 1) % len(partners)]
            ap.append(APInvoice(
                partner_id=sup.partner_id,
                purchase_order_ref=f"PO-{2025}{i:04d}",
                invoice_date=date.today() - timedelta(days=25 - i),
                due_date=date.today() + timedelta(days=10),
                total_amount=d(str(7000000 + i * 350000)),
                paid_amount=d(str(2000000 + i * 120000)) if i % 4 == 0 else d("0"),
                payment_status=ap_status[i % len(ap_status)],
                entry_id=entries[(i - 1) % len(entries)].entry_id
            ))
        session.add_all(ap)
        session.flush()

        # Cash transactions
        ct_type = ["RECEIPT", "PAYMENT"]
        pm = ["CASH", "BANK_TRANSFER"]
        cash = []
        for i in range(1, 11):
            cash.append(CashTransaction(
                transaction_type=ct_type[i % len(ct_type)],
                amount=d(str(800000 + i * 100000)),
                payment_method=pm[i % len(pm)],
                bank_account_number="0123456789" if i % 2 == 0 else None,
                reference_doc_id=f"REF-{i:04d}",
                entry_id=entries[(i - 1) % len(entries)].entry_id,
                created_at=datetime.utcnow()
            ))
        session.add_all(cash)
        session.flush()

        # Posting rules
        posting_modules = ["SALES", "PURCHASE", "CASH"]
        rules = []
        for i in range(1, 11):
            rules.append(PostingRule(
                event_code=f"EVT{i:03d}",
                event_description=f"Rule {i}",
                debit_account_id=accounts[(i - 1) % len(accounts)].account_id,
                credit_account_id=accounts[(i) % len(accounts)].account_id,
                module_source=posting_modules[i % len(posting_modules)]
            ))
        session.add_all(rules)

        session.commit()
        print("[OK] Seed Finance done.")
    finally:
        session.close()


def seed_supply_chain():
    session = SupplyChainSessionLocal()
    try:
        BASE = date(2025, 12, 15)
        # Warehouses (10)
        w_types = ["TRADING", "ASSET", "TRANSIT"]
        warehouses = []
        for i in range(1, 11):
            warehouses.append(Warehouse(
                warehouse_code=f"WH{i:03d}",
                warehouse_name=f"Kho {i}",
                warehouse_type=w_types[i % len(w_types)],
                address=f"{i} Đường Kho Vận, Quận {(i%12)+1}",
                is_active=True,
                created_at=datetime.utcnow()
            ))
        session.add_all(warehouses)
        session.flush()

        # Bin locations (>=10)
        bins = []
        for i in range(1, 21):
            wh = warehouses[(i - 1) % len(warehouses)]
            bins.append(BinLocation(
                warehouse_id=wh.warehouse_id,
                bin_code=f"{wh.warehouse_code}-BIN{i:03d}",
                description=f"Vị trí {i} của {wh.warehouse_code}",
                max_capacity=d("9999.99")
            ))
        session.add_all(bins)
        session.flush()

        # Product categories (10) with parents
        cats = []
        # 5 root
        for i in range(1, 6):
            cats.append(ProductCategory(
                category_name=["Điện thoại", "Laptop", "Tai nghe", "Màn hình", "Phụ kiện"][i-1],
                parent_id=None
            ))
        session.add_all(cats)
        session.flush()
        # 5 children
        for i in range(6, 11):
            parent = cats[(i - 6) % 5]
            cats.append(ProductCategory(
                category_name=f"{parent.category_name} - Nhóm {i-5}",
                parent_id=parent.category_id
            ))
        session.add_all(cats[5:])
        session.flush()

        # Products (10)
        p_types = ["TRADING_GOODS", "COMPANY_ASSET"]
        products = []
        sku_list = ["IP15-128", "IP15PM-256", "SS24-256", "MAC-AIR-M3", "DELL-7420",
                    "SONY-WH1000", "AIRPODS-PRO2", "LG-27UP", "LOGI-MX3", "ANKER-65W"]
        for i in range(1, 11):
            products.append(ScProduct(
                sku=sku_list[i-1],
                product_name=f"Sản phẩm SCM {i}",
                category_id=cats[(i - 1) % len(cats)].category_id,
                unit_of_measure="pcs",
                product_type=p_types[i % len(p_types)],
                min_stock_level=int(5 + (i % 5)),
                brand=["Apple", "Samsung", "Dell", "Sony", "Logitech", "Anker"][i % 6],
                warranty_months=int(12 + (i % 3) * 12),
                image_url=f"https://img.local/scm_{i}.jpg",
                created_at=datetime.utcnow()
            ))
        session.add_all(products)
        session.flush()

        # Suppliers (10)
        suppliers = []
        for i in range(1, 11):
            suppliers.append(Supplier(
                supplier_code=f"SUP{i:03d}",
                supplier_name=f"Nhà cung cấp {i}",
                tax_code=f"SUPTAX{i:05d}",
                contact_email=f"sup{i}@mail.local",
                contact_phone=f"08{(30_000_000 + i*33333) % 100_000_000:08d}",
                address=f"{i} KCN, Tỉnh {(i%10)+1}",
                rating=float(3.5 + (i % 5) * 0.3),
                finance_partner_id=1000 + i,  # cross-module reference (finance)
                created_at=datetime.utcnow()
            ))
        session.add_all(suppliers)
        session.flush()

        # Purchase Requests (10)
        pr_status = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PROCESSED"]
        prs = []
        for i in range(1, 11):
            prs.append(PurchaseRequest(
                pr_code=f"PR-{2025}{i:04d}",
                requester_id=200 + i,        # cross-module reference (hrm.employee.id)
                department_id=10 + (i % 5),  # cross-module reference
                request_date=BASE - timedelta(days=20 - i),
                reason=f"Yêu cầu mua vật tư {i}",
                status=pr_status[i % len(pr_status)],
                created_at=datetime.utcnow()
            ))
        session.add_all(prs)
        session.flush()

        # PR Items (>=10)
        pr_items = []
        for i in range(1, 21):
            pr = prs[(i - 1) % len(prs)]
            prod = products[(i - 1) % len(products)]
            pr_items.append(PRItem(
                pr_id=pr.pr_id,
                product_id=prod.product_id,
                quantity_requested=int((i % 5) + 1)
            ))
        session.add_all(pr_items)
        session.flush()

        # Quotations (10)
        q_status = ["PENDING", "ACCEPTED", "REJECTED"]
        quotations = []
        for i in range(1, 11):
            sup = suppliers[(i - 1) % len(suppliers)]
            pr = prs[(i - 1) % len(prs)]
            quotations.append(Quotation(
                rfq_code=f"RFQ-{2025}{i:04d}",
                supplier_id=sup.supplier_id,
                pr_id=pr.pr_id,
                quotation_date=BASE - timedelta(days=10 - i),
                valid_until=BASE + timedelta(days=30),
                total_amount=d(str(10_000_000 + i * 1_250_000)),
                status=q_status[i % len(q_status)],
                is_selected=True if i % 4 == 0 else False
            ))
        session.add_all(quotations)
        session.flush()

        # Purchase Orders (10)
        po_status = ["DRAFT", "APPROVED", "PARTIAL_RECEIVED", "COMPLETED", "CANCELLED"]
        pos = []
        for i in range(1, 11):
            q = quotations[i - 1]
            sup = suppliers[(i - 1) % len(suppliers)]
            pos.append(PurchaseOrder(
                po_code=f"PO-{2025}{i:04d}",
                quotation_id=q.quotation_id,
                supplier_id=sup.supplier_id,
                order_date=BASE - timedelta(days=8 - i),
                expected_delivery_date=BASE + timedelta(days=7 + i),
                total_amount=d(str(9_000_000 + i * 1_100_000)),
                tax_amount=d(str(500_000 + i * 50_000)),
                discount_amount=d(str((i % 3) * 100_000)),
                status=po_status[i % len(po_status)],
                approved_by=500 + i,
                created_at=datetime.utcnow()
            ))
        session.add_all(pos)
        session.flush()

        # PO Items (>=10)
        po_items = []
        for i in range(1, 21):
            po = pos[(i - 1) % len(pos)]
            prod = products[(i - 1) % len(products)]
            qty = int((i % 5) + 1)
            recv = int(qty - 1) if i % 4 == 0 else int(qty)  # some partial received
            po_items.append(POItem(
                po_id=po.po_id,
                product_id=prod.product_id,
                quantity_ordered=qty,
                quantity_received=recv,
                unit_price=d(str(1_000_000 + i * 80_000))
            ))
        session.add_all(po_items)
        session.flush()

        # Goods Receipts (10)
        gr_status = ["DRAFT", "CONFIRMED"]
        grs = []
        for i in range(1, 11):
            po = pos[(i - 1) % len(pos)]
            wh = warehouses[(i - 1) % len(warehouses)]
            grs.append(GoodsReceipt(
                gr_code=f"GR-{2025}{i:04d}",
                po_id=po.po_id,
                warehouse_id=wh.warehouse_id,
                receipt_date=BASE - timedelta(days=3 - (i % 3)),
                received_by=600 + i,
                status=gr_status[i % len(gr_status)],
                finance_journal_entry_id=9000 + i
            ))
        session.add_all(grs)
        session.flush()

        # GR Items (>=10)
        gr_items = []
        for i in range(1, 21):
            gr = grs[(i - 1) % len(grs)]
            prod = products[(i - 1) % len(products)]
            # chọn bin thuộc warehouse của GR
            wh_bins = [b for b in bins if b.warehouse_id == gr.warehouse_id]
            bin_pick = wh_bins[(i - 1) % len(wh_bins)]
            qty = int((i % 5) + 1)
            gr_items.append(GRItem(
                gr_id=gr.gr_id,
                product_id=prod.product_id,
                bin_id=bin_pick.bin_id,
                quantity_received=qty,
                rejected_quantity=int(1) if i % 7 == 0 else int(0),
                batch_number=f"BATCH-{i:04d}" if i % 2 == 0 else None,
                serial_number=f"SERIAL-{i:06d}" if i % 3 == 0 else None
            ))
        session.add_all(gr_items)
        session.flush()

        # Goods Issues (10)
        gi_types = ["SALES_ORDER", "INTERNAL_USE", "TRANSFER", "RETURN_TO_VENDOR"]
        gi_status = ["DRAFT", "CONFIRMED"]
        gis = []
        for i in range(1, 11):
            wh = warehouses[(i - 1) % len(warehouses)]
            gis.append(GoodsIssue(
                gi_code=f"GI-{2025}{i:04d}",
                warehouse_id=wh.warehouse_id,
                issue_type=gi_types[i % len(gi_types)],
                reference_doc_id=f"REFDOC-{i:04d}",
                issue_date=BASE - timedelta(days=i),
                status=gi_status[i % len(gi_status)],
                finance_journal_entry_id=9100 + i
            ))
        session.add_all(gis)
        session.flush()

        # GI Items (>=10)
        gi_items = []
        for i in range(1, 21):
            gi = gis[(i - 1) % len(gis)]
            prod = products[(i - 1) % len(products)]
            wh_bins = [b for b in bins if b.warehouse_id == gi.warehouse_id]
            bin_pick = wh_bins[(i - 1) % len(wh_bins)]
            gi_items.append(GIItem(
                gi_id=gi.gi_id,
                product_id=prod.product_id,
                bin_id=bin_pick.bin_id,
                quantity_issued=int((i % 4) + 1)
            ))
        session.add_all(gi_items)
        session.flush()

        # Current Stock (>=10), unique (warehouse_id, bin_id, product_id)
        stocks = []
        combos = []
        for wh in warehouses:
            wh_bins = [b for b in bins if b.warehouse_id == wh.warehouse_id]
            for b in wh_bins:
                for p in products:
                    combos.append((wh.warehouse_id, b.bin_id, p.product_id))
        for i, (wh_id, bin_id, prod_id) in enumerate(combos[:20], start=1):
            stocks.append(CurrentStock(
                warehouse_id=wh_id,
                bin_id=bin_id,
                product_id=prod_id,
                quantity_on_hand=int(50 + i * 3),
                quantity_allocated=int(i % 7),
                updated_at=datetime.utcnow()
            ))
        session.add_all(stocks)
        session.flush()

        # Inventory Transaction Logs (>=10)
        tx_types = ["INBOUND", "OUTBOUND", "ADJUSTMENT", "TRANSFER"]
        logs = []
        for i in range(1, 31):
            prod = products[(i - 1) % len(products)]
            wh = warehouses[(i - 1) % len(warehouses)]
            wh_bins = [b for b in bins if b.warehouse_id == wh.warehouse_id]
            bin_pick = wh_bins[(i - 1) % len(wh_bins)]
            t = tx_types[i % len(tx_types)]
            qty_change = int((i % 5) + 1) * (1 if t in ["INBOUND", "ADJUSTMENT"] else -1)
            ref = f"GR-{2025}{(i%10)+1:04d}" if t == "INBOUND" else f"GI-{2025}{(i%10)+1:04d}"
            logs.append(InventoryTransactionLog(
                transaction_type=t,
                product_id=prod.product_id,
                warehouse_id=wh.warehouse_id,
                bin_id=bin_pick.bin_id,
                quantity_change=qty_change,
                reference_code=ref,
                transaction_date=datetime.utcnow() - timedelta(days=i),
                performed_by=700 + (i % 5)
            ))
        session.add_all(logs)
        session.flush()

        # Stocktakes (10)
        st_status = ["IN_PROGRESS", "COMPLETED", "ADJUSTED"]
        stocktakes = []
        for i in range(1, 11):
            wh = warehouses[(i - 1) % len(warehouses)]
            stocktakes.append(Stocktake(
                stocktake_code=f"STK-{2025}{i:04d}",
                warehouse_id=wh.warehouse_id,
                start_date=BASE - timedelta(days=30 - i),
                end_date=BASE - timedelta(days=28 - i),
                status=st_status[i % len(st_status)]
            ))
        session.add_all(stocktakes)
        session.flush()

        # Stocktake details (>=10)
        st_details = []
        for i in range(1, 21):
            st = stocktakes[(i - 1) % len(stocktakes)]
            prod = products[(i - 1) % len(products)]
            system_qty = int(40 + (i % 10))
            actual_qty = system_qty + (-2 if i % 5 == 0 else (1 if i % 4 == 0 else 0))
            st_details.append(StocktakeDetail(
                stocktake_id=st.stocktake_id,
                product_id=prod.product_id,
                system_quantity=system_qty,
                actual_quantity=actual_qty
            ))
        session.add_all(st_details)
        session.flush()

        # Purchase Returns (10)
        pr_status2 = ["DRAFT", "CONFIRMED"]
        returns = []
        for i in range(1, 11):
            po = pos[(i - 1) % len(pos)]
            sup = suppliers[(i - 1) % len(suppliers)]
            returns.append(PurchaseReturn(
                return_code=f"PRTN-{2025}{i:04d}",
                po_id=po.po_id,
                supplier_id=sup.supplier_id,
                return_date=BASE - timedelta(days=i),
                reason=f"Trả hàng do lỗi/không đạt {i}",
                status=pr_status2[i % len(pr_status2)],
                finance_journal_entry_id=9200 + i
            ))
        session.add_all(returns)

        session.commit()
        print("[OK] Seed Supply Chain done.")
    finally:
        session.close()


def main():
    args = parse_args()
    create_tables(reset=args.reset)

    # Seed data
    seed_hrm()
    seed_sale_crm()
    seed_finance()
    seed_supply_chain()

    print("\nDONE. Bạn có thể bắt đầu viết FN-2 tools để truy vấn động từ DB.")


if __name__ == "__main__":
    main()
