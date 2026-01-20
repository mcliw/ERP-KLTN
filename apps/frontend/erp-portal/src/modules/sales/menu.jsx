import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";
import {
  FaTachometerAlt, FaClipboardCheck, FaShoppingBag, FaUsers
} from "react-icons/fa";

export const salesMenu = [
  {
    label: "Trang chủ Bán hàng",
    path: "/sales/trang-chu-ban-hang",
    icon: <FaTachometerAlt />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },

  {
    label: "Đơn hàng",
    path: "/sales/don-hang",
    icon: <FaShoppingBag />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },

  {
    label: "Khách hàng",
    path: "/sales/khach-hang",
    icon: <FaUsers />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },

  {
    label: "Mã giảm giá",
    path: "/sales/ma-giam-gia",
    icon: <FaClipboardCheck />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },
];