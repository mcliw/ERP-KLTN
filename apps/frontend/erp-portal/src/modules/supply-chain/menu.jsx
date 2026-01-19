// src/modules/supply-chain/menu.jsx

// Tạm thời dùng quyền HRM để test hiển thị
import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";
import {
  FaTachometerAlt,
  FaAddressCard,
  FaClock,
  FaMoneyBill,
  FaUsers,
  FaUserTag,
  FaUserCircle,
} from "react-icons/fa";

export const supplychainMenu = [
  {
    label: "SC Dashboard",
    path: "/supply-chain/dashboard",
    icon: <FaTachometerAlt />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW], // Chú ý: Dùng mảng []
  },
  {
    label: "Sản phẩm & Tài sản",
    path: "/supply-chain/san-pham-tai-san",
    icon: <FaAddressCard />,
    roles: [HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW],
  },
  {
    label: "Nhà cung cấp",
    path: "/supply-chain/nha-cung-cap",
    icon: <FaClock />,
    roles: [HRM_PERMISSIONS.HRM_TIME_KEEPING_VIEW],
  },
  {
    label: "Tồn kho",
    path: "/supply-chain/ton-kho",
    icon: <FaMoneyBill />,
    roles: [HRM_PERMISSIONS.HRM_SALARY_INFO_VIEW],
  },
  {
    label: "Nhập kho",
    path: "/supply-chain/nhap-kho",
    icon: <FaUsers />,
    roles: [HRM_PERMISSIONS.HRM_DEPARTMENT_VIEW],
  },
  {
    label: "Xuất kho",
    path: "/supply-chain/xuat-kho",
    icon: <FaUserTag />,
    roles: [HRM_PERMISSIONS.HRM_POSITION_VIEW],
  },
  {
    label: "Kiểm kê",
    path: "/supply-chain/kiem-ke",
    icon: <FaUserCircle />,
    roles: [HRM_PERMISSIONS.HRM_ACCOUNT_VIEW],
  },
];