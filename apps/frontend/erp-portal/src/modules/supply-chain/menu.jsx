import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";
import {
  FaTachometerAlt,
  FaBox,          
  FaTruck,       
  FaWarehouse,   
  FaSearchLocation,
  FaArchive,
  FaDolly,       
  FaFileAlt,
  FaShippingFast, 
  FaClipboardCheck, 
  FaSitemap  
} from "react-icons/fa";

export const supplychainMenu = [
  {
    label: "Trang chủ SCM",
    path: "/supply-chain/trang-chu-chuoi-cung-ung",
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
    label: "Vị trí",
    path: "/supply-chain/vi-tri-kho",
    icon: <FaSearchLocation />,
    roles: [HRM_PERMISSIONS.HRM_SALARY_INFO_VIEW],
  },
  {
    label: "Tồn kho",
    path: "/supply-chain/ton-kho",
    icon: <FaArchive />,
    roles: [HRM_PERMISSIONS.HRM_SALARY_INFO_VIEW],
  },
  {
    label: "Yêu cầu mua hàng",
    path: "/supply-chain/yeu-cau-mua-hang",
    icon: <FaDolly />,
    roles: [HRM_PERMISSIONS.HRM_DEPARTMENT_VIEW],
  },
  {
    label: "Báo giá",
    path: "/supply-chain/bao-gia",
    icon: <FaClipboardCheck />,
    roles: [HRM_PERMISSIONS.HRM_ACCOUNT_VIEW],
  },
  {
    label: "Đơn mua hàng",
    path: "/supply-chain/don-mua-hang",
    icon: <FaFileAlt />,
    roles: [HRM_PERMISSIONS.HRM_ACCOUNT_VIEW],
  },
];