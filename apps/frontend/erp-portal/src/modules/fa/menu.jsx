import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";
import { FaTachometerAlt, FaUserCircle, FaArrowsAlt, FaFileAlt, FaClipboardCheck } from "react-icons/fa";

export const financeMenu = [
  {
    label: "Trang chủ FA",
    path: "/finance/trang-chu-tai-chinh-ke-toan",
    icon: <FaTachometerAlt />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },

  {
    label: "Hệ thống tài khoản FA",
    path: "/finance/he-thong-tai-khoan",
    icon: <FaUserCircle />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },

  {
    label: "Định khoản tự động",
    path: "/finance/dinh-khoan",
    icon: <FaArrowsAlt />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },

  {
    label: "Phiếu thu",
    path: "/finance/phieu-thu",
    icon: <FaClipboardCheck />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },

  {
    label: "Phiếu chi",
    path: "/finance/phieu-chi",
    icon: <FaFileAlt />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },
];