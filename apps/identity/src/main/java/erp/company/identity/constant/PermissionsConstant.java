package erp.company.identity.constant;

public class PermissionsConstant { //34 PERMISSIONS
    public static class HRM {
        public static final String ACCOUNT_VIEW = "HRM_ACCOUNT_VIEW";
        public static final String ACCOUNT_CREATE = "HRM_ACCOUNT_CREATE";
        public static final String ACCOUNT_UPDATE = "HRM_ACCOUNT_UPDATE";
        public static final String ACCOUNT_DELETE = "HRM_ACCOUNT_DELETE";
        
        public static final String BENEFIT_VIEW = "HRM_BENEFIT_VIEW";
        public static final String BENEFIT_CREATE = "HRM_BENEFIT_CREATE";
        public static final String BENEFIT_UPDATE = "HRM_BENEFIT_UPDATE";
        public static final String BENEFIT_DELETE = "HRM_BENEFIT_DELETE";

        public static final String CONTRACT_VIEW = "HRM_CONTRACT_VIEW";
        public static final String CONTRACT_CREATE = "HRM_CONTRACT_CREATE";
        public static final String CONTRACT_UPDATE = "HRM_CONTRACT_UPDATE";
        public static final String CONTRACT_DELETE = "HRM_CONTRACT_DELETE";

        public static final String REPORT_VIEW = "HRM_REPORT_VIEW";
        public static final String REPORT_EXPORT = "HRM_REPORT_EXPORT";

        public static final String LEAVE_VIEW = "HRM_LEAVE_VIEW";
        public static final String LEAVE_CREATE = "HRM_LEAVE_CREATE";
        public static final String LEAVE_APPROVE = "HRM_LEAVE_APPROVE";
        public static final String LEAVE_REJECT = "HRM_LEAVE_REJECT";
        public static final String LEAVE_DELETE = "HRM_LEAVE_DELETE";

        public static final String DEPARTMENT_VIEW = "HRM_DEPARTMENT_VIEW";
        public static final String DEPARTMENT_CREATE = "HRM_DEPARTMENT_CREATE";
        public static final String DEPARTMENT_UPDATE = "HRM_DEPARTMENT_UPDATE";
        public static final String DEPARTMENT_DELETE = "HRM_DEPARTMENT_DELETE";

        public static final String EMPLOYEE_VIEW = "HRM_EMPLOYEE_VIEW";
        public static final String EMPLOYEE_CREATE = "HRM_EMPLOYEE_CREATE";
        public static final String EMPLOYEE_UPDATE = "HRM_EMPLOYEE_UPDATE";
        public static final String EMPLOYEE_DELETE = "HRM_EMPLOYEE_DELETE";

        public static final String SALARY_INFO_VIEW = "HRM_SALARY_INFO_VIEW";
        public static final String SALARY_INFO_CREATE = "HRM_SALARY_INFO_CREATE";
        public static final String SALARY_INFO_UPDATE = "HRM_SALARY_INFO_UPDATE";

        public static final String POSITION_VIEW = "HRM_POSITION_VIEW";
        public static final String POSITION_CREATE = "HRM_POSITION_CREATE";
        public static final String POSITION_UPDATE = "HRM_POSITION_UPDATE";
        public static final String POSITION_DELETE = "HRM_POSITION_DELETE";
    }

    public static class SUPPLYCHAIN { //40 PERMISSIONS
        public static final String COMPANY_ASSETS_VIEW = "SUPPLYCHAIN_COMPANY_ASSETS_VIEW";
        public static final String COMPANY_ASSETS_CREATE = "SUPPLYCHAIN_COMPANY_ASSETS_CREATE";
        public static final String COMPANY_ASSETS_UPDATE = "SUPPLYCHAIN_COMPANY_ASSETS_UPDATE";
        public static final String COMPANY_ASSETS_DELETE = "SUPPLYCHAIN_COMPANY_ASSETS_DELETE";

        public static final String MASTERDATA_VIEW = "SUPPLYCHAIN_MASTERDATA_VIEW";
        public static final String MASTERDATA_CREATE = "SUPPLYCHAIN_MASTERDATA_CREATE";
        public static final String MASTERDATA_UPDATE = "SUPPLYCHAIN_MASTERDATA_UPDATE";
        public static final String MASTERDATA_DELETE = "SUPPLYCHAIN_MASTERDATA_DELETE";

        public static final String PURCHASE_REQUISITION_VIEW = "SUPPLYCHAIN_PURCHASE_REQUISITION_VIEW";
        public static final String PURCHASE_REQUISITION_CREATE = "SUPPLYCHAIN_PURCHASE_REQUISITION_CREATE";
        public static final String PURCHASE_REQUISITION_DELETE = "SUPPLYCHAIN_PURCHASE_REQUISITION_DELETE";
        public static final String PURCHASE_REQUISITION_CONFIRM = "SUPPLYCHAIN_PURCHASE_REQUISITION_CONFIRM";
        public static final String PURCHASE_REQUISITION_REJECT = "SUPPLYCHAIN_PURCHASE_REQUISITION_REJECT";

        public static final String QUOTATION_SUPPLIER_VIEW = "SUPPLYCHAIN_QUOTATION_SUPPLIER_VIEW";
        public static final String QUOTATION_SUPPLIER_CREATE = "SUPPLYCHAIN_QUOTATION_SUPPLIER_CREATE";
        public static final String QUOTATION_SUPPLIER_UPDATE = "SUPPLYCHAIN_QUOTATION_SUPPLIER_UPDATE";
        public static final String QUOTATION_SUPPLIER_DELETE = "SUPPLYCHAIN_QUOTATION_SUPPLIER_DELETE";

        public static final String PURCHASE_ORDER_VIEW = "SUPPLYCHAIN_PURCHASE_ORDER_VIEW";
        public static final String PURCHASE_ORDER_CREATE = "SUPPLYCHAIN_PURCHASE_ORDER_CREATE";
        public static final String PURCHASE_ORDER_UPDATE = "SUPPLYCHAIN_PURCHASE_ORDER_UPDATE";
        public static final String PURCHASE_ORDER_CONFIRM = "SUPPLYCHAIN_PURCHASE_ORDER_CONFIRM";
        public static final String PURCHASE_ORDER_REJECT = "SUPPLYCHAIN_PURCHASE_ORDER_REJECT";
        public static final String PURCHASE_ORDER_DELETE = "SUPPLYCHAIN_PURCHASE_ORDER_DELETE";

        public static final String PURCHASE_RETURN_VIEW = "SUPPLYCHAIN_PURCHASE_RETURN_VIEW";
        public static final String PURCHASE_RETURN_CREATE = "SUPPLYCHAIN_PURCHASE_RETURN_CREATE";
        public static final String PURCHASE_RETURN_UPDATE = "SUPPLYCHAIN_PURCHASE_RETURN_UPDATE";
        public static final String PURCHASE_RETURN_DELETE = "SUPPLYCHAIN_PURCHASE_RETURN_DELETE";

        public static final String GOODS_RECEIPTS_VIEW = "SUPPLYCHAIN_GOODS_RECEIPTS_VIEW";
        public static final String GOODS_RECEIPTS_CONFIRM = "SUPPLYCHAIN_GOODS_RECEIPTS_CONFIRM";
        public static final String GOODS_RECEIPTS_UPDATE = "SUPPLYCHAIN_GOODS_RECEIPTS_UPDATE";

        public static final String GOODS_ISSUE_VIEW = "SUPPLYCHAIN_GOODS_ISSUE_VIEW";
        // BÁN HÀNG
        public static final String GOODS_ISSUE_REQUEST = "SUPPLYCHAIN_GOODS_ISSUE_REQUEST";
        public static final String GOODS_ISSUE_CONFIRM = "SUPPLYCHAIN_GOODS_ISSUE_CONFIRM";
        // CẤP PHÁT NHÂN VIÊN
        public static final String GOODS_ISSUE_CREATE = "SUPPLYCHAIN_GOODS_ISSUE_CREATE";
        public static final String GOODS_ISSUE_DELETE = "SUPPLYCHAIN_GOODS_ISSUE_DELETE";

        public static final String INVENTORY_CONTROL_VIEW = "SUPPLYCHAIN_INVENTORY_CONTROL_VIEW";

        public static final String STOCK_TAKE_VIEW = "SUPPLYCHAIN_STOCK_TAKE_VIEW";
        public static final String STOCK_TAKE_CREATE = "SUPPLYCHAIN_STOCK_TAKE_CREATE";
        public static final String STOCK_TAKE_UPDATE = "SUPPLYCHAIN_STOCK_TAKE_UPDATE";
        public static final String STOCK_TAKE_DELETE = "SUPPLYCHAIN_STOCK_TAKE_DELETE";

        public static final String REPORT_VIEW = "SUPPLYCHAIN_REPORT_VIEW";
        public static final String REPORT_EXPORT = "SUPPLYCHAIN_REPORT_EXPORT";

        public static final String SUPPLIER_VIEW = "SUPPLYCHAIN_SUPPLIER_VIEW";
        public static final String SUPPLIER_CREATE = "SUPPLYCHAIN_SUPPLIER_CREATE";
        public static final String SUPPLIER_UPDATE = "SUPPLYCHAIN_SUPPLIER_UPDATE";
        public static final String SUPPLIER_DELETE = "SUPPLYCHAIN_SUPPLIER_DELETE";

    }

    public static class SALES { //14 PERMISSIONS
        public static final String CUSTOMER_VIEW = "SALES_CUSTOMER_VIEW";
        public static final String CUSTOMER_UPDATE = "SALES_CUSTOMER_UPDATE"; // CẬP NHẬT GHI CHÚ VỀ KHÁCH HÀNG CRM

        public static final String ORDER_MANAGEMENT_VIEW = "SALES_ORDER_MANAGEMENT_VIEW"; //DANH SÁCH ĐƠN HÀNG
        public static final String POS_ORDER_CREATE = "SALES_POS_ORDER_CREATE"; //TẠO ĐƠN HÀNG KHI KHÁCH ĐẶT TRỰC TIẾP HOẶC QUA TƯ VẤN
        public static final String ORDER_CONFIRM = "SALES_ORDER_CONFIRM";
        public static final String ORDER_REJECT = "SALES_ORDER_CANCEL";
        public static final String ORDER_MANAGEMENT_DELETE = "SALES_ORDER_MANAGEMENT_DELETE"; //XÓA ĐƠN HÀNG DO NHÂN VIÊN TẠO

        public static final String VOUCHER_VIEW = "SALES_VOUCHER_VIEW";
        public static final String VOUCHER_CREATE = "SALES_VOUCHER_CREATE";
        public static final String VOUCHER_UPDATE = "SALES_VOUCHER_UPDATE";
        public static final String VOUCHER_DELETE = "SALES_VOUCHER_DELETE";

        public static final String PAYMENT_RECORDING_CONFIRM = "SALES_PAYMENT_RECORDING_CONFIRM"; //XÁC NHẬN THANH TOÁN TIỀN MẶT/CHUYỂN KHOẢN/QRPAY

        public static final String REPORT_VIEW = "SALES_REPORT_VIEW";
        public static final String REPORT_EXPORT = "SALES_REPORT_EXPORT";
    }

    public static class ACCOUNTING { //27 PERMISSIONS
        public static final String CHART_OF_ACCOUNTS_VIEW = "ACCOUNTING_CHART_OF_ACCOUNTS_VIEW";
        public static final String CHART_OF_ACCOUNTS_CREATE = "ACCOUNTING_CHART_OF_ACCOUNTS_CREATE";
        public static final String CHART_OF_ACCOUNTS_UPDATE = "ACCOUNTING_CHART_OF_ACCOUNTS_UPDATE";
        public static final String CHART_OF_ACCOUNTS_DELETE = "ACCOUNTING_CHART_OF_ACCOUNTS_DELETE";

        public static final String SETUP_AUTOMATIC_VIEW = "ACCOUNTING_SETUP_AUTOMATIC_VIEW";
        public static final String SETUP_AUTOMATIC_CREATE = "ACCOUNTING_SETUP_AUTOMATIC_CREATE";
        public static final String SETUP_AUTOMATIC_UPDATE = "ACCOUNTING_SETUP_AUTOMATIC_UPDATE";
        public static final String SETUP_AUTOMATIC_DELETE = "ACCOUNTING_SETUP_AUTOMATIC_DELETE";

        public static final String JOURNAL_ENTRY_VIEW = "ACCOUNTING_JOURNAL_ENTRY_VIEW";
        public static final String JOURNAL_ENTRY_CREATE = "ACCOUNTING_JOURNAL_ENTRY_CREATE";
        public static final String JOURNAL_ENTRY_UPDATE = "ACCOUNTING_JOURNAL_ENTRY_UPDATE";
        public static final String JOURNAL_ENTRY_DELETE = "ACCOUNTING_JOURNAL_ENTRY_DELETE";

        public static final String PERIOD_CLOSING_APPROVE = "ACCOUNTING_PERIOD_CLOSING_APPROVE";

        public static final String CASHFLOW_VIEW = "ACCOUNTING_CASHFLOW_VIEW";
        public static final String REPORT_EXPORT = "ACCOUNTING_REPORT_EXPORT";

        public static final String PAYMENT_VIEW = "ACCOUNTING_PAYMENT_VIEW";
        public static final String PAYMENT_CREATE = "ACCOUNTING_PAYMENT_CREATE";
        public static final String PAYMENT_UPDATE = "ACCOUNTING_PAYMENT_UPDATE";
        public static final String PAYMENT_DELETE = "ACCOUNTING_PAYMENT_DELETE";

        public static final String RECEIPT_VIEW = "ACCOUNTING_RECEIPT_VIEW";
        public static final String RECEIPT_CREATE = "ACCOUNTING_RECEIPT_CREATE";
        public static final String RECEIPT_UPDATE = "ACCOUNTING_RECEIPT_UPDATE";
        public static final String RECEIPT_DELETE = "ACCOUNTING_RECEIPT_DELETE";

        public static final String PAYROLL_VIEW = "ACCOUNTING_PAYROLL_VIEW";
        public static final String PAYROLL_CREATE = "ACCOUNTING_PAYROLL_CREATE";
        public static final String PAYROLL_UPDATE = "ACCOUNTING_PAYROLL_UPDATE";
        public static final String PAYROLL_DELETE = "ACCOUNTING_PAYROLL_DELETE";
    }
}
