import { ROLES } from "../shared/constants/roles";

export function redirectByRole(navigate, role) {
  switch (role) {
    case ROLES.ADMIN:
    case ROLES.HR_MANAGER:
    case ROLES.HR_EMPLOYEE:
      navigate("/hrm/dashboard", { replace: true });
      break;

    case ROLES.SCM_MANAGER:
    case ROLES.SCM_EMPLOYEE:
      navigate("/scm/inventory", { replace: true });
      break;

    case ROLES.SALES_CRM_MANAGER:
    case ROLES.SALES_CRM_EMPLOYEE:
      navigate("/sales_crm/orders", { replace: true });
      break;

    case ROLES.FINANCE_ACCOUNTING_MANAGER:
    case ROLES.FINANCE_ACCOUNTING_EMPLOYEE:
      navigate("/finance_accounting/ledger", { replace: true });
      break;

    case ROLES.SUPPLY_CHAIN_MANAGER:
    case ROLES.SUPPLY_CHAIN_EMPLOYEE:
      navigate("/supply_chain", { replace: true });
      break;

    default:
      navigate("/login", { replace: true });
  }
}