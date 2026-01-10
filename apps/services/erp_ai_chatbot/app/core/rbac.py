MODULE_ALLOWED_ROLES = {
    "hrm": {"HR_ADMIN", "HR_STAFF", "MANAGER"},
    "sale_crm": {"SALES", "CSKH", "MANAGER"},
    "finance_accounting": {"ACCOUNTANT", "FINANCE_MANAGER"},
    "supply_chain": {"WAREHOUSE", "PROCUREMENT", "MANAGER"},
}

def check_role(module: str, role: str | None) -> bool:
    if role is None:
        return False
    return role in MODULE_ALLOWED_ROLES.get(module, set())
