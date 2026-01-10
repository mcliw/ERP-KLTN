
from sqlalchemy import (
    Column, Integer, BigInteger, String, Date, DateTime,
    Numeric, Enum, ForeignKey, Boolean, Text, Index, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.finance_database import FinanceBase, FinanceSessionLocal

# =========================
# BUSINESS PARTNER
# =========================
class BusinessPartner(FinanceBase):
    __tablename__ = "business_partners"

    partner_id = Column(Integer, primary_key=True)
    partner_type = Column(Enum("CUSTOMER", "SUPPLIER", name="partner_type_enum"), nullable=False)
    external_id = Column(String(50), nullable=False)
    partner_name = Column(String(255), nullable=False)
    tax_code = Column(String(50))
    contact_info = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("partner_type", "external_id", name="unique_partner"),
    )

# =========================
# FISCAL PERIOD
# =========================
class FiscalPeriod(FinanceBase):
    __tablename__ = "fiscal_periods"

    period_id = Column(Integer, primary_key=True)
    period_name = Column(String(50))
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(Enum("OPEN", "CLOSED", name="fiscal_status_enum"))

    closed_at = Column(DateTime)
    closed_by_user_id = Column(String(50))

# =========================
# JOURNAL ENTRY
# =========================
class JournalEntry(FinanceBase):
    __tablename__ = "journal_entries"

    entry_id = Column(BigInteger, primary_key=True)
    transaction_date = Column(Date)
    posting_date = Column(DateTime)
    reference_no = Column(String(50))
    description = Column(Text)

    source_module = Column(Enum(
        "SALES", "PURCHASE", "CASH", "MANUAL",
        name="source_module_enum"
    ))

    status = Column(Enum("DRAFT", "POSTED", name="journal_status_enum"))
    fiscal_period_id = Column(Integer, ForeignKey("fiscal_periods.period_id"))
    total_amount = Column(Numeric(19, 4))
    created_by = Column(String(50))

    fiscal_period = relationship("FiscalPeriod")

# =========================
# CHART OF ACCOUNTS
# =========================
class ChartOfAccounts(FinanceBase):
    __tablename__ = "chart_of_accounts"

    account_id = Column(Integer, primary_key=True)
    account_code = Column(String(20), nullable=False)
    account_name = Column(String(255))
    account_type = Column(Enum(
        "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE",
        name="account_type_enum"
    ))

    parent_account_id = Column(Integer, ForeignKey("chart_of_accounts.account_id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    parent_account = relationship("ChartOfAccounts", remote_side=[account_id])

    __table_args__ = (
        UniqueConstraint("account_code", name="unique_account_code"),
        Index("idx_parent_account", "parent_account_id"),
    )

# =========================
# JOURNAL ENTRY LINE
# =========================
class JournalEntryLine(FinanceBase):
    __tablename__ = "journal_entry_lines"

    line_id = Column(BigInteger, primary_key=True)
    entry_id = Column(BigInteger, ForeignKey("journal_entries.entry_id"))
    account_id = Column(Integer, ForeignKey("chart_of_accounts.account_id"))
    partner_id = Column(Integer, ForeignKey("business_partners.partner_id"))

    debit_amount = Column(Numeric(19, 4), default=0)
    credit_amount = Column(Numeric(19, 4), default=0)
    description = Column(String(255))

    __table_args__ = (
        Index("idx_journal_line", "entry_id", "account_id", "partner_id"),
    )

# =========================
# ACCOUNTS RECEIVABLE INVOICE
# =========================
class ARInvoice(FinanceBase):
    __tablename__ = "ar_invoices"

    invoice_id = Column(BigInteger, primary_key=True)
    partner_id = Column(Integer, ForeignKey("business_partners.partner_id"))
    sales_order_ref = Column(String(50))

    invoice_date = Column(Date)
    due_date = Column(Date)

    total_amount = Column(Numeric(19, 4))
    received_amount = Column(Numeric(19, 4))
    payment_status = Column(Enum("UNPAID", "PARTIAL", "PAID", name="ar_payment_status"))

    entry_id = Column(BigInteger, ForeignKey("journal_entries.entry_id"))

    __table_args__ = (
        Index("idx_ar_partner", "partner_id"),
        Index("idx_ar_entry", "entry_id"),
    )

# =========================
# ACCOUNTS PAYABLE INVOICE
# =========================
class APInvoice(FinanceBase):
    __tablename__ = "ap_invoices"

    invoice_id = Column(BigInteger, primary_key=True)
    partner_id = Column(Integer, ForeignKey("business_partners.partner_id"))
    purchase_order_ref = Column(String(50))

    invoice_date = Column(Date)
    due_date = Column(Date)

    total_amount = Column(Numeric(19, 4))
    paid_amount = Column(Numeric(19, 4))
    payment_status = Column(Enum("UNPAID", "PARTIAL", "PAID", name="ap_payment_status"))

    entry_id = Column(BigInteger, ForeignKey("journal_entries.entry_id"))

    __table_args__ = (
        Index("idx_ap_partner", "partner_id"),
        Index("idx_ap_entry", "entry_id"),
    )

# =========================
# CASH TRANSACTION
# ========================= 
class CashTransaction(FinanceBase):
    __tablename__ = "cash_transactions"

    transaction_id = Column(BigInteger, primary_key=True)
    transaction_type = Column(Enum(
        "RECEIPT", "PAYMENT",
        name="cash_transaction_type"
    ))

    amount = Column(Numeric(19, 4))
    payment_method = Column(Enum("CASH", "BANK_TRANSFER", name="payment_method_enum"))
    bank_account_number = Column(String(50))

    reference_doc_id = Column(String(50))
    entry_id = Column(BigInteger, ForeignKey("journal_entries.entry_id"))

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_cash_entry", "entry_id"),
    )

# =========================
# POSTING RULE
# =========================
class PostingRule(FinanceBase):
    __tablename__ = "posting_rules"

    rule_id = Column(Integer, primary_key=True)
    event_code = Column(String(50), nullable=False)
    event_description = Column(String(255))

    debit_account_id = Column(Integer, ForeignKey("chart_of_accounts.account_id"))
    credit_account_id = Column(Integer, ForeignKey("chart_of_accounts.account_id"))

    module_source = Column(Enum(
        "SALES", "PURCHASE", "CASH",
        name="posting_module_enum"
    ))

    __table_args__ = (
        UniqueConstraint("event_code", name="unique_event_code"),
        Index("idx_posting_debit", "debit_account_id"),
        Index("idx_posting_credit", "credit_account_id"),
    )
