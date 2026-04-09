# app/core/role/scope_matrix.py
ROLE_SCOPE_MATRIX = {
  "ADMIN": {"*": "ALL"},

  # HR
  "HR_MANAGER": {"hrm": "ALL", "*": "SELF"},
  "DEPT_MANAGER": {"hrm": "DEPT", "*": "SELF"},
  "EMPLOYEE": {"*": "SELF"},

  # Supply chain
  "PURCHASING_MANAGER": {"supply_chain": "ALL", "*": "SELF"},
  "STOREKEEPER": {"supply_chain": "ALL", "*": "SELF"},

  # Sales
  "SALES_ADMIN": {"sale_crm": "ALL", "*": "SELF"},

  # Finance & Accounting
  "CFO": {"finance_accounting": "ALL", "*": "SELF"},
  "RECEIVABLE_ACC": {"finance_accounting": "DEPT", "*": "SELF"},
  "PAYABLE_ACC": {"finance_accounting": "DEPT", "*": "SELF"},
  "PAYROLL_ACC": {"finance_accounting": "DEPT", "*": "SELF"},

  # External
  "CUSTOMER": {"sale_crm": "SELF", "*": "NONE"},  
}
