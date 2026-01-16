MODULE_ALLOWED_ROLES = {
    "hrm": {"a","HR_ADMIN", "HR_STAFF", "MANAGER"},
    "sale_crm": {"a","SALES", "CSKH", "MANAGER","CUSTOMER","CS","ADMIN"},
    "finance_accounting": {"a","ACCOUNTANT", "FINANCE_MANAGER"},
    "supply_chain": {"a","WAREHOUSE", "PROCUREMENT", "MANAGER"},
}

def check_role(module: str, role: str | None) -> bool:
    if role is None:
        return False
    return role in MODULE_ALLOWED_ROLES.get(module, set())
