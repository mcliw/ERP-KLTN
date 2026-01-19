from app.core.role.auth_context import build_auth_context
from app.core.role.rbac import check_role

USER_ID = "829f90b9-d38e-4e2b-b96e-9eaae18981a8"
ctx = build_auth_context(user_id=USER_ID)

for m in ["hrm", "supply_chain", "sale_crm", "finance_accounting"]:
    print(m, "=>", check_role(m, ctx))
