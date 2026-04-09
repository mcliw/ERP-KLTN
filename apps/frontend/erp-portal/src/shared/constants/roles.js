// src/shared/constants/roles.js

/* * 1. KHAI BÁO CẤU HÌNH GỐC (MASTER CONFIG)
 * Đây là nơi duy nhất bạn chỉnh sửa sau này.
 * Key: Mã Role (dùng trong Code/Database)
 * Value: Tên hiển thị (dùng cho UI)
 */
const ROLE_CONFIG = {
  ADMIN: "Quản trị hệ thống - Toàn quyền",
  EMPLOYEE: "Nhân viên cơ bản (Nội bộ)",
  DEPT_MANAGER: "Quản lý phòng ban",
  HR_MANAGER: "Quản lý nhân sự",
  PURCHASING_MANAGER: "Quản lý mua sắm",
  STOREKEEPER: "Thủ kho",
  CUSTOMER: "Khách hàng (Bên ngoài)",
  SALES_ADMIN: "Quản trị bán hàng",
  CFO: "Kế toán trưởng",
  RECEIVABLE_ACC: "Kế toán công nợ phải thu",
  PAYABLE_ACC: "Kế toán công nợ phải trả",
  PAYROLL_ACC: "Kế toán tiền lương"
};

/* * 2. XUẤT RA DẠNG 1: CONSTANTS CHO LOGIC (Giữ nguyên tương thích cũ)
 * Kết quả sinh ra: 
 * export const ROLES = { 
 * ADMIN: "ADMIN", 
 * HR_MANAGER: "HR_MANAGER", 
 * ... 
 * }
 * -> Giúp các đoạn code như `if (role === ROLES.ADMIN)` vẫn chạy đúng.
 */
export const ROLES = Object.keys(ROLE_CONFIG).reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {});

/* * 3. XUẤT RA DẠNG 2: OPTIONS CHO UI (Select/Dropdown)
 * Kết quả sinh ra:
 * export const ROLE_OPTIONS = [
 * { value: "ADMIN", label: "Quản trị hệ thống - Toàn quyền" },
 * ...
 * ]
 */
export const ROLE_OPTIONS = Object.entries(ROLE_CONFIG).map(([key, label]) => ({
  value: key,
  label: label
}));

/*
 * 4. HELPER FUNCTION (Tiện ích bổ sung)
 * Dùng để hiển thị tên role trong các bảng (Table) hoặc chi tiết user
 * Ví dụ dùng: {getRoleLabel(user.role)} -> Hiển thị "Quản lý nhân sự" thay vì "HR_MANAGER"
 */
export const getRoleLabel = (roleCode) => {
  return ROLE_CONFIG[roleCode] || roleCode;
};