// src/modules/hrm/menu.jsx

import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions"; // Đảm bảo đúng đường dẫn file bạn vừa tạo
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
    label: "Trang chủ Nhân sự",
    path: "/hrm/trang-chu-nhan-su",
    icon: <FaTachometerAlt />,
    // Trong file permission, HRM_REPORT_VIEW đã là mảng ['ADMIN', 'CFO'...] nên gán trực tiếp
    roles: HRM_PERMISSIONS.HRM_REPORT_VIEW, 
  },
  {
    label: "Hồ sơ nhân viên",
    path: "/hrm/ho-so-nhan-vien",
    icon: <FaAddressCard />,
    roles: HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW,
  },
  {
    label: "Chấm công",
    path: "/hrm/cham-cong",
    icon: <FaClock />,
    roles: HRM_PERMISSIONS.HRM_TIME_KEEPING_VIEW,
  },
  {
    label: "Lương",
    path: "/hrm/quan-ly-luong",
    icon: <FaMoneyBill />,
    roles: HRM_PERMISSIONS.HRM_SALARY_INFO_VIEW,
  },
  {
    label: "Phòng ban",
    path: "/hrm/phong-ban",
    icon: <FaUsers />,
    roles: HRM_PERMISSIONS.HRM_DEPARTMENT_VIEW,
  },
  {
    label: "Chức vụ",
    path: "/hrm/chuc-vu",
    icon: <FaUserTag />,
    roles: HRM_PERMISSIONS.HRM_POSITION_VIEW,
  },
  {
    label: "Tài khoản",
    path: "/hrm/tai-khoan",
    icon: <FaUserCircle />,
    roles: HRM_PERMISSIONS.HRM_ACCOUNT_VIEW,
  },
  {
    label: "Nghỉ phép",
    path: "/hrm/nghi-phep",
    icon: <FaFileAlt />,
    roles: HRM_PERMISSIONS.HRM_LEAVE_VIEW,
  },
];