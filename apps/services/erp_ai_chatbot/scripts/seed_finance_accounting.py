# app/db/seed_finance.py
from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete

from app.db.finance_database import FinanceSessionLocal
from app.modules.finance_accounting.models import (
    BusinessPartner,
    FiscalPeriod,
    ChartOfAccounts,
    PostingRule,
    JournalEntry,
    JournalEntryLine,
    ARInvoice,
    APInvoice,
    CashTransaction,
)

def seed_finance(n: int = 10) -> None:
    session = FinanceSessionLocal()
    try:
        # =========================
        # 0) CLEAN (child -> parent)
        # =========================
        session.execute(delete(CashTransaction))
        session.execute(delete(ARInvoice))
        session.execute(delete(APInvoice))
        session.execute(delete(JournalEntryLine))
        session.execute(delete(JournalEntry))
        session.execute(delete(PostingRule))
        session.execute(delete(ChartOfAccounts))
        session.execute(delete(FiscalPeriod))
        session.execute(delete(BusinessPartner))
        session.commit()

        # =========================
        # 1) BUSINESS PARTNERS (10)
        # - 1..10 => CUSTOMER EXT0001..EXT0010
        # (đúng mẫu bạn test EXT0006)
        # =========================
        partners = []
        for i in range(1, n + 1):
            partners.append(
                BusinessPartner(
                    partner_id=i,
                    partner_type="CUSTOMER",
                    external_id=f"EXT{i:04d}",
                    partner_name=f"Đối tác {i}",
                    tax_code=f"TX{i:05d}",
                    contact_info={"email": f"partner{i}@mail.local", "phone": f"09000000{i:02d}"},
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
            )
        session.add_all(partners)
        session.commit()

        # =========================
        # 2) FISCAL PERIODS (10)
        # =========================
        periods = []
        base_year = 2025
        for m in range(1, n + 1):
            start = date(base_year, m, 1)
            end = date(base_year, m, 28)  # đủ test
            periods.append(
                FiscalPeriod(
                    period_id=m,
                    period_name=f"{base_year}-{m:02d}",
                    start_date=start,
                    end_date=end,
                    status="OPEN" if m >= 9 else "CLOSED",
                    closed_at=datetime.utcnow() if m < 9 else None,
                    closed_by_user_id="1" if m < 9 else None,
                )
            )
        session.add_all(periods)
        session.commit()

        # =========================
        # 3) CHART OF ACCOUNTS (10)
        # =========================
        coa_seed = [
            (1,  "111",  "Tiền mặt",                 "ASSET",     None),
            (2,  "112",  "Tiền gửi ngân hàng",       "ASSET",     None),
            (3,  "131",  "Phải thu khách hàng",      "ASSET",     None),
            (4,  "331",  "Phải trả nhà cung cấp",    "LIABILITY", None),
            (5,  "511",  "Doanh thu bán hàng",       "REVENUE",   None),
            (6,  "632",  "Giá vốn hàng bán",         "EXPENSE",   None),
            (7,  "641",  "Chi phí bán hàng",         "EXPENSE",   None),
            (8,  "642",  "Chi phí QLDN",             "EXPENSE",   None),
            (9,  "3331", "Thuế GTGT phải nộp",       "LIABILITY", None),
            (10, "911",  "Xác định KQKD",            "EQUITY",    None),
        ]
        accounts = []
        for account_id, code, name, typ, parent_id in coa_seed:
            accounts.append(
                ChartOfAccounts(
                    account_id=account_id,
                    account_code=code,
                    account_name=name,
                    account_type=typ,
                    parent_account_id=parent_id,
                    is_active=True,
                    created_at=datetime.utcnow(),
                )
            )
        session.add_all(accounts)
        session.commit()

        # helper map
        acc = {a.account_code: a.account_id for a in accounts}

        # =========================
        # 4) POSTING RULES (10)
        # =========================
        rules_seed = [
            ("AR_INVOICE",        "Ghi nhận hóa đơn AR",      "131",  "511",  "SALES"),
            ("AR_RECEIPT",        "Thu tiền AR",              "112",  "131",  "CASH"),
            ("AP_INVOICE",        "Ghi nhận hóa đơn AP",      "632",  "331",  "PURCHASE"),
            ("AP_PAYMENT",        "Chi tiền AP",              "331",  "112",  "CASH"),
            ("CASH_RECEIPT",      "Phiếu thu tiền mặt",       "111",  "911",  "CASH"),
            ("CASH_PAYMENT",      "Phiếu chi tiền mặt",       "911",  "111",  "CASH"),
            ("BANK_RECEIPT",      "Thu chuyển khoản",         "112",  "911",  "CASH"),
            ("BANK_PAYMENT",      "Chi chuyển khoản",         "911",  "112",  "CASH"),
            ("VAT_OUTPUT",        "Thuế GTGT đầu ra",          "511",  "3331", "SALES"),
            ("OVERHEAD_EXPENSE",  "Chi phí quản lý",          "642",  "112",  "CASH"),
        ]
        rules = []
        for idx, (code, desc, debit_code, credit_code, mod) in enumerate(rules_seed, start=1):
            rules.append(
                PostingRule(
                    rule_id=idx,
                    event_code=code,
                    event_description=desc,
                    debit_account_id=acc[debit_code],
                    credit_account_id=acc[credit_code],
                    module_source=mod,
                )
            )
        session.add_all(rules)
        session.commit()

        # =========================
        # 5) JOURNAL ENTRIES (10)
        # =========================
        entries = []
        entry_base = 9000001
        for i in range(1, n + 1):
            trans_date = date(2025, ((i - 1) % 10) + 1, 10)
            entries.append(
                JournalEntry(
                    entry_id=entry_base + i,
                    transaction_date=trans_date,
                    posting_date=datetime.utcnow(),
                    reference_no=f"JE-{entry_base + i}",
                    description=f"Bút toán seed #{i}",
                    source_module="SALES" if i <= 5 else "CASH",
                    status="POSTED",
                    fiscal_period_id=((i - 1) % 10) + 1,
                    total_amount=Decimal(str(1000000 + i * 100000)),
                    created_by="system",
                )
            )
        session.add_all(entries)
        session.commit()

        # =========================
        # 6) JOURNAL ENTRY LINES (>= 20)
        # mỗi entry 2 lines (Nợ/Có) => 20 lines
        # =========================
        lines = []
        line_base = 8000001
        for i in range(1, n + 1):
            entry_id = entry_base + i
            partner_id = i  # gắn theo EXT000i
            amount = Decimal(str(1000000 + i * 100000))

            # Nợ 112, Có 911 (cho đơn giản, đủ test sổ nhật ký)
            lines.append(
                JournalEntryLine(
                    line_id=line_base + (i * 2 - 1),
                    entry_id=entry_id,
                    account_id=acc["112"],
                    partner_id=partner_id,
                    debit_amount=amount,
                    credit_amount=Decimal("0"),
                    description=f"Debit seed #{i}",
                )
            )
            lines.append(
                JournalEntryLine(
                    line_id=line_base + (i * 2),
                    entry_id=entry_id,
                    account_id=acc["911"],
                    partner_id=partner_id,
                    debit_amount=Decimal("0"),
                    credit_amount=amount,
                    description=f"Credit seed #{i}",
                )
            )
        session.add_all(lines)
        session.commit()

        # =========================
        # 7) AR INVOICES (10)
        # status: UNPAID/PARTIAL/PAID xen kẽ
        # =========================
        ar_invs = []
        ar_base = 7000001
        for i in range(1, n + 1):
            inv_id = ar_base + i
            total = Decimal(str(500000 + i * 200000))
            if i % 3 == 1:
                status, received = "UNPAID", Decimal("0")
            elif i % 3 == 2:
                status, received = "PARTIAL", (total * Decimal("0.3")).quantize(Decimal("1"))
            else:
                status, received = "PAID", total

            inv_date = date(2025, ((i - 1) % 10) + 1, 5)
            due = inv_date + timedelta(days=30)

            ar_invs.append(
                ARInvoice(
                    invoice_id=inv_id,
                    partner_id=i,
                    sales_order_ref=f"SO-2025{i:04d}",
                    invoice_date=inv_date,
                    due_date=due,
                    total_amount=total,
                    received_amount=received,
                    payment_status=status,
                    entry_id=entry_base + i,
                )
            )
        session.add_all(ar_invs)
        session.commit()

        # =========================
        # 8) AP INVOICES (10)
        # (dùng partner_type CUSTOMER vẫn OK về FK; nếu bạn muốn SUPPLIER riêng thì mình sẽ tách thêm)
        # =========================
        ap_invs = []
        ap_base = 7100001
        for i in range(1, n + 1):
            inv_id = ap_base + i
            total = Decimal(str(400000 + i * 150000))
            if i % 3 == 1:
                status, paid = "UNPAID", Decimal("0")
            elif i % 3 == 2:
                status, paid = "PARTIAL", (total * Decimal("0.5")).quantize(Decimal("1"))
            else:
                status, paid = "PAID", total

            inv_date = date(2025, ((i - 1) % 10) + 1, 7)
            due = inv_date + timedelta(days=20)

            ap_invs.append(
                APInvoice(
                    invoice_id=inv_id,
                    partner_id=i,
                    purchase_order_ref=f"PO-2025{i:04d}",
                    invoice_date=inv_date,
                    due_date=due,
                    total_amount=total,
                    paid_amount=paid,
                    payment_status=status,
                    entry_id=entry_base + i,
                )
            )
        session.add_all(ap_invs)
        session.commit()

        # =========================
        # 9) CASH TRANSACTIONS (10)
        # xen kẽ RECEIPT/PAYMENT + CASH/BANK_TRANSFER
        # =========================
        cts = []
        ct_base = 6000001
        for i in range(1, n + 1):
            ttype = "RECEIPT" if i % 2 == 1 else "PAYMENT"
            method = "BANK_TRANSFER" if i % 2 == 1 else "CASH"
            amount = Decimal(str(200000 + i * 50000))
            cts.append(
                CashTransaction(
                    transaction_id=ct_base + i,
                    transaction_type=ttype,
                    amount=amount,
                    payment_method=method,
                    bank_account_number="123-456-789" if method == "BANK_TRANSFER" else None,
                    reference_doc_id=f"REF-{ct_base + i}",
                    entry_id=entry_base + i,
                    created_at=datetime.utcnow(),
                )
            )
        session.add_all(cts)
        session.commit()

        print("✅ Seed finance OK: mỗi bảng 10 dòng (JELines = 20).")

    finally:
        session.close()


if __name__ == "__main__":
    seed_finance(10)
