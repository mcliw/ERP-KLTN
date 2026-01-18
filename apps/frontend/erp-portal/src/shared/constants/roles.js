// apps/frontend/erp-portal/src/shared/constants/roles.js

export const ROLES = {
  // --- Quản trị & Cơ bản ---
  ADMIN: "ADMIN",                         // Quản trị hệ thống - Toàn quyền
  EMPLOYEE: "EMPLOYEE",                   // Nhân viên cơ bản (Nội bộ)
  CUSTOMER: "CUSTOMER",                   // Khách hàng (Bên ngoài)
  DEPT_MANAGER: "DEPT_MANAGER",           // Quản lý phòng ban

  // --- Nhân sự (HR) ---
  HR_MANAGER: "HR_MANAGER",               // Quản lý nhân sự

  // --- Mua sắm & Kho (Purchasing & Warehouse) ---
  PURCHASING_MANAGER: "PURCHASING_MANAGER", // Quản lý mua sắm
  STOREKEEPER: "STOREKEEPER",             // Thủ kho

  // --- Bán hàng (Sales) ---
  SALES_ADMIN: "SALES_ADMIN",             // Quản trị bán hàng

  // --- Tài chính & Kế toán (Finance & Accounting) ---
  CFO: "CFO",                             // Kế toán trưởng
  RECEIVABLE_ACC: "RECEIVABLE_ACC",       // Kế toán công nợ phải thu
  PAYABLE_ACC: "PAYABLE_ACC",             // Kế toán công nợ phải trả
  PAYROLL_ACC: "PAYROLL_ACC",             // Kế toán tiền lương
};