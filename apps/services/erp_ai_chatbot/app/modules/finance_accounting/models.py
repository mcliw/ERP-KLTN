from __future__ import annotations
import enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Date, Text, Enum, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
# Import Base từ file cấu hình riêng của Finance mà bạn đã định nghĩa
from app.db.finance_database import FinanceBase

# --- 1. ENUM DEFINITIONS ---

class AccountTypeEnum(str, enum.Enum):
    ASSET = "ASSET"         # Tài sản
    LIABILITY = "LIABILITY" # Nợ phải trả
    EQUITY = "EQUITY"       # Vốn chủ sở hữu
    REVENUE = "REVENUE"     # Doanh thu
    EXPENSE = "EXPENSE"     # Chi phí

class PartnerTypeEnum(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    SUPPLIER = "SUPPLIER"
    EMPLOYEE = "EMPLOYEE"

class FiscalPeriodStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class ModuleSourceEnum(str, enum.Enum):
    PURCHASING = "PURCHASING"
    SALES = "SALES"
    HRM = "HRM"
    INVENTORY = "INVENTORY"
    TREASURY = "TREASURY"
    MANUAL = "MANUAL"

class JournalEntryStatusEnum(str, enum.Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"
    CANCELLED = "CANCELLED"

class PaymentStatusEnum(str, enum.Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"

class TransactionTypeEnum(str, enum.Enum):
    RECEIPT = "RECEIPT" # Thu tiền
    PAYMENT = "PAYMENT" # Chi tiền

class PaymentMethodEnum(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"

# --- 2. MASTER DATA ---

class ChartOfAccounts(FinanceBase):
    __tablename__ = "chart_of_accounts"
    
    account_id = Column(Integer, primary_key=True, index=True)
    account_code = Column(String(20), unique=True, nullable=False)
    account_name = Column(String(255), nullable=False)
    account_type = Column(Enum(AccountTypeEnum), nullable=False)
    parent_account_id = Column(Integer, ForeignKey("chart_of_accounts.account_id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Quan hệ đệ quy (Parent - Children)
    children = relationship("ChartOfAccounts", 
                            backref=backref("parent", remote_side=[account_id]))
    
    # Quan hệ với các bảng giao dịch
    debit_rules = relationship("PostingRule", foreign_keys="[PostingRule.debit_account_id]", back_populates="debit_account")
    credit_rules = relationship("PostingRule", foreign_keys="[PostingRule.credit_account_id]", back_populates="credit_account")
    journal_lines = relationship("JournalEntryLine", back_populates="account")

class BusinessPartner(FinanceBase):
    __tablename__ = "business_partners"
    __table_args__ = (UniqueConstraint('partner_type', 'external_id', name='_partner_external_uc'),)
    
    partner_id = Column(Integer, primary_key=True, index=True)
    partner_type = Column(Enum(PartnerTypeEnum), nullable=False)
    external_id = Column(String(50), nullable=False) # ID từ hệ thống vệ tinh (CUS-001, SUP-002)
    partner_name = Column(String(255), nullable=False)
    tax_code = Column(String(50))
    contact_info = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    journal_lines = relationship("JournalEntryLine", back_populates="partner")
    ap_invoices = relationship("APInvoice", back_populates="partner")
    ar_invoices = relationship("ARInvoice", back_populates="partner")

class FiscalPeriod(FinanceBase):
    __tablename__ = "fiscal_periods"
    
    period_id = Column(Integer, primary_key=True, index=True)
    period_name = Column(String(50)) # "Tháng 10-2025"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(Enum(FiscalPeriodStatusEnum), default=FiscalPeriodStatusEnum.OPEN)
    closed_at = Column(DateTime(timezone=True))
    closed_by_user_id = Column(String(50))
    
    journal_entries = relationship("JournalEntry", back_populates="fiscal_period")

# --- 3. CONFIGURATION ---

class PostingRule(FinanceBase):
    __tablename__ = "posting_rules"
    
    rule_id = Column(Integer, primary_key=True, index=True)
    event_code = Column(String(50), unique=True, nullable=False) # GRN_CONFIRMED
    event_description = Column(String(255))
    debit_account_id = Column(Integer, ForeignKey("chart_of_accounts.account_id"), nullable=False)
    credit_account_id = Column(Integer, ForeignKey("chart_of_accounts.account_id"), nullable=False)
    module_source = Column(Enum(ModuleSourceEnum), nullable=False)
    
    debit_account = relationship("ChartOfAccounts", foreign_keys=[debit_account_id], back_populates="debit_rules")
    credit_account = relationship("ChartOfAccounts", foreign_keys=[credit_account_id], back_populates="credit_rules")

# --- 4. CORE LEDGER (GL) ---

class JournalEntry(FinanceBase):
    __tablename__ = "journal_entries"
    
    entry_id = Column(Integer, primary_key=True, index=True) # Dùng Integer (BigInt trong SQL)
    transaction_date = Column(Date, nullable=False)
    posting_date = Column(DateTime(timezone=True), server_default=func.now())
    reference_no = Column(String(50)) # PO-123
    description = Column(Text)
    source_module = Column(Enum(ModuleSourceEnum), nullable=False)
    status = Column(Enum(JournalEntryStatusEnum), default=JournalEntryStatusEnum.POSTED)
    fiscal_period_id = Column(Integer, ForeignKey("fiscal_periods.period_id"))
    total_amount = Column(Numeric(19, 4), nullable=False)
    created_by = Column(String(50))
    
    fiscal_period = relationship("FiscalPeriod", back_populates="journal_entries")
    lines = relationship("JournalEntryLine", back_populates="entry", cascade="all, delete-orphan")
    
    # Quan hệ ngược từ các sổ chi tiết
    ap_invoice = relationship("APInvoice", uselist=False, back_populates="entry")
    ar_invoice = relationship("ARInvoice", uselist=False, back_populates="entry")
    cash_transaction = relationship("CashTransaction", uselist=False, back_populates="entry")

class JournalEntryLine(FinanceBase):
    __tablename__ = "journal_entry_lines"
    
    line_id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("journal_entries.entry_id"), nullable=False)
    account_id = Column(Integer, ForeignKey("chart_of_accounts.account_id"), nullable=False)
    partner_id = Column(Integer, ForeignKey("business_partners.partner_id"), nullable=True)
    debit_amount = Column(Numeric(19, 4), default=0)
    credit_amount = Column(Numeric(19, 4), default=0)
    description = Column(String(255))
    
    entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("ChartOfAccounts", back_populates="journal_lines")
    partner = relationship("BusinessPartner", back_populates="journal_lines")

# --- 5. SUB-LEDGERS ---

class APInvoice(FinanceBase):
    """Sổ chi tiết phải trả người bán (Accounts Payable)"""
    __tablename__ = "ap_invoices"
    
    invoice_id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("business_partners.partner_id"), nullable=False)
    purchase_order_ref = Column(String(50)) # Link ID PO
    invoice_date = Column(Date)
    due_date = Column(Date)
    total_amount = Column(Numeric(19, 4))
    paid_amount = Column(Numeric(19, 4), default=0)
    payment_status = Column(Enum(PaymentStatusEnum), default=PaymentStatusEnum.UNPAID)
    entry_id = Column(Integer, ForeignKey("journal_entries.entry_id")) # Link GL
    
    partner = relationship("BusinessPartner", back_populates="ap_invoices")
    entry = relationship("JournalEntry", back_populates="ap_invoice")

class ARInvoice(FinanceBase):
    """Sổ chi tiết phải thu khách hàng (Accounts Receivable)"""
    __tablename__ = "ar_invoices"
    
    invoice_id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("business_partners.partner_id"), nullable=False)
    sales_order_ref = Column(String(50)) # Link ID SO
    invoice_date = Column(Date)
    due_date = Column(Date)
    total_amount = Column(Numeric(19, 4))
    received_amount = Column(Numeric(19, 4), default=0)
    payment_status = Column(Enum(PaymentStatusEnum), default=PaymentStatusEnum.UNPAID)
    entry_id = Column(Integer, ForeignKey("journal_entries.entry_id")) # Link GL
    
    partner = relationship("BusinessPartner", back_populates="ar_invoices")
    entry = relationship("JournalEntry", back_populates="ar_invoice")

class CashTransaction(FinanceBase):
    """Sổ quỹ tiền mặt / Tiền gửi ngân hàng"""
    __tablename__ = "cash_transactions"
    
    transaction_id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(Enum(TransactionTypeEnum), nullable=False)
    amount = Column(Numeric(19, 4), nullable=False)
    payment_method = Column(Enum(PaymentMethodEnum), nullable=False)
    bank_account_number = Column(String(50))
    reference_doc_id = Column(Integer) # ID hóa đơn hoặc phiếu thu/chi
    entry_id = Column(Integer, ForeignKey("journal_entries.entry_id"), nullable=False) # Link GL
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    entry = relationship("JournalEntry", back_populates="cash_transaction")