// src/modules/hrm/menu.jsx

import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";
import {
  FaUsers,
  FaTachometerAlt,
  FaClock,
  FaMoneyBill,
  FaUserTag,
  FaAddressCard,
  FaFileAlt,
  FaUserCircle,
} from "react-icons/fa";

export const hrmMenu = [
  {
    label: "Dashboard",
    path: "/hrm/dashboard",
    icon: <FaTachometerAlt />,
    roles: HRM_PERMISSIONS.DASHBOARD,
  },
  {
    label: "Hồ sơ nhân viên",
    path: "/hrm/ho-so-nhan-vien",
    icon: <FaAddressCard />,
    roles: HRM_PERMISSIONS.EMPLOYEE_VIEW,
  },
  {
    label: "Chấm công",
    path: "/hrm/cham-cong",
    icon: <FaClock />,
    roles: HRM_PERMISSIONS.TIMEKEPPING,
  },
  {
    label: "Lương",
    path: "/hrm/luong",
    icon: <FaMoneyBill />,
    roles: HRM_PERMISSIONS.PAYROLL,
  },
  {
    label: "Phòng ban",
    path: "/hrm/phong-ban",
    icon: <FaUsers />,
    roles: HRM_PERMISSIONS.DEPARTMENT_VIEW,
  },
  {
    label: "Chức vụ",
    path: "/hrm/chuc-vu",
    icon: <FaUserTag />,
    roles: HRM_PERMISSIONS.POSITION_VIEW,
  },
  {
    label: "Tài khoản",
    path: "/hrm/tai-khoan",
    icon: <FaUserCircle />,
    roles: HRM_PERMISSIONS.ACCOUNT,
  },
  {
    label: "Nghỉ phép",
    path: "/hrm/nghi-phep",
    icon: <FaFileAlt />,
    roles: HRM_PERMISSIONS.LEAVE,
  },
];