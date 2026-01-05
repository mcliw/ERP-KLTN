import { ROLES } from "../../shared/constants/roles";
import {
  FaUsers,
  FaTachometerAlt,
  FaClock,
  FaMoneyBill,
  FaFileContract,
  FaUserTag,
  FaAddressCard,
  FaFileAlt,
  FaUserCircle,
  FaHandHoldingUsd,
} from "react-icons/fa";

export const hrmMenu = [
  {
    label: "Dashboard",
    path: "/hrm/dashboard",
    icon: <FaTachometerAlt />,
    roles: [ROLES.ADMIN, ROLES.HR],
  },
  {
    label: "Hồ sơ nhân viên",
    path: "/hrm/ho-so-nhan-vien",
    icon: <FaAddressCard />,
    roles: [ROLES.ADMIN, ROLES.HR],
  },
  {
    label: "Hợp đồng",
    path: "/hrm/hop-dong-lao-dong",
    icon: <FaFileContract />,
    roles: [ROLES.ADMIN, ROLES.HR],
  },
  {
    label: "Chấm công",
    path: "/hrm/cham-cong",
    icon: <FaClock />,
    roles: [ROLES.ADMIN, ROLES.HR],
  },

  // ✅ TÁCH 2 MỤC
  {
    label: "Lương",
    path: "/hrm/luong",
    icon: <FaMoneyBill />,
    roles: [ROLES.ADMIN, ROLES.HR],
  },
  {
    label: "Phúc lợi",
    path: "/hrm/phuc-loi",
    icon: <FaHandHoldingUsd />,
    roles: [ROLES.ADMIN, ROLES.HR],
  },

  {
    label: "Phòng ban",
    path: "/hrm/phong-ban",
    icon: <FaUsers />,
    roles: [ROLES.ADMIN, ROLES.HR],
  },
  {
    label: "Chức vụ",
    path: "/hrm/chuc-vu",
    icon: <FaUserTag />,
    roles: [ROLES.ADMIN, ROLES.HR],
  },
  {
    label: "Tài khoản",
    path: "/hrm/tai-khoan",
    icon: <FaUserCircle />,
    roles: [ROLES.ADMIN, ROLES.HR],
  },
  {
    label: "Nghỉ phép",
    path: "/hrm/nghi-phep",
    icon: <FaFileAlt />,
    roles: [ROLES.ADMIN, ROLES.HR],
  },
];
