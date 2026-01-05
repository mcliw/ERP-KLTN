import { ROLES } from "../shared/constants/roles";

export function redirectByRole(navigate, role) {
  switch (role) {
    case ROLES.ADMIN:
    case ROLES.HR:
      navigate("/hrm/dashboard", { replace: true });
      break;
    case ROLES.SCM:
      navigate("/scm/inventory", { replace: true });
      break;
    case ROLES.SALES:
      navigate("/sales/orders", { replace: true });
      break;
    case ROLES.FINANCE:
      navigate("/finance/ledger", { replace: true });
      break;
    default:
      navigate("/login", { replace: true });
  }
}
