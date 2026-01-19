import { ROLES } from "../shared/constants/roles";

export function redirectByRole(navigate, role) {
  switch (role) {
    case ROLES.ADMIN:
    case ROLES.HR_MANAGER:
    case ROLES.EMPLOYEE:
      navigate("/hrm/trang-chu-nhan-su", { replace: true });
      break;

    case ROLES.ADMIN:
    case ROLES.EMPLOYEE:
      navigate("/scm/inventory", { replace: true });
      break;

    case ROLES.ADMIN:
    case ROLES.EMPLOYEE:
      navigate("/sales_crm/orders", { replace: true });
      break;

    case ROLES.ADMIN:
    case ROLES.EMPLOYEE:
      navigate("/finance_accounting/ledger", { replace: true });
      break;

    case ROLES.ADMIN:
    case ROLES.EMPLOYEE:
      navigate("/supply_chain", { replace: true });
      break;

    default:
      navigate("/login", { replace: true });
  }
}