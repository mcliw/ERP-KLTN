import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";
import {
  FaTachometerAlt,
  FaBox,          // Thay icon AddressCard bằng Box (Hộp hàng)
  FaTruck,        // Thay Clock bằng Truck (Xe tải - Nhà cung cấp)
  FaWarehouse,    // Thay MoneyBill bằng Warehouse (Kho)
  FaDolly,        // Nhập kho
  FaShippingFast, // Xuất kho
  FaClipboardCheck, // Kiểm kê
  FaSitemap       // Danh mục
} from "react-icons/fa";

export const supplychainMenu = [
  {
    label: "SCM Dashboard",
    path: "/supply-chain/dashboard",
    icon: <FaTachometerAlt />,
    roles: [HRM_PERMISSIONS.HRM_REPORT_VIEW],
  },
  {
    label: "Danh mục Sản phẩm & Tài sản",
    path: "/supply-chain/danh-muc-san-pham-tai-san",
    icon: <FaSitemap />,
    roles: [HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW],
  },
  {
    label: "Sản phẩm & Tài sản",
    path: "/supply-chain/san-pham-tai-san",
    icon: <FaBox />,
    roles: [HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW],
  },
  {
    label: "Nhà cung cấp",
    path: "/supply-chain/nha-cung-cap",
    icon: <FaTruck />,
    roles: [HRM_PERMISSIONS.HRM_TIME_KEEPING_VIEW],
  },
  {
    label: "Kho hàng",
    path: "/supply-chain/kho-hang",
    icon: <FaWarehouse />,
    roles: [HRM_PERMISSIONS.HRM_SALARY_INFO_VIEW],
  },
  {
    label: "Tồn kho",
    path: "/supply-chain/ton-kho",
    icon: <FaWarehouse />,
    roles: [HRM_PERMISSIONS.HRM_SALARY_INFO_VIEW],
  },
  {
    label: "Yêu cầu mua hàng",
    path: "/supply-chain/yeu-cau-mua-hang",
    icon: <FaDolly />,
    roles: [HRM_PERMISSIONS.HRM_DEPARTMENT_VIEW],
  },
  {
    label: "Xuất kho",
    path: "/supply-chain/xuat-kho",
    icon: <FaShippingFast />,
    roles: [HRM_PERMISSIONS.HRM_POSITION_VIEW],
  },
  {
    label: "Kiểm kê",
    path: "/supply-chain/kiem-ke",
    icon: <FaClipboardCheck />,
    roles: [HRM_PERMISSIONS.HRM_ACCOUNT_VIEW],
  },
];