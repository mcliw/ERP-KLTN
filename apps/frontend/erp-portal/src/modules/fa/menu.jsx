import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";
import {
  FaTachometerAlt
} from "react-icons/fa";

export const supplychainMenu = [
  {
    label: "Trang chủ FA",
    path: "/supply-chain/trang-chu-ke-toan",
    icon: <FaTachometerAlt />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },
]