// apps/frontend/erp-portal/src/modules/hrm/validations/account.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields
 * ========================= */
export const baseAccountFields = {
  username: z
    .string()
    .trim()
    .min(1, "Tên đăng nhập bắt buộc")
    .max(30, "Tên đăng nhập quá dài")
    .regex(/^[A-Za-z0-9._-]+$/, "Tên đăng nhập không chứa ký tự đặc biệt"),

  employeeCode: z.string().trim().min(1, "Phải chọn nhân viên"),

  /**
   * Auto-fill từ employee (readonly ở UI)
   */
  department: emptyToUndefined(z.string().trim()),
  position: emptyToUndefined(z.string().trim()),

  role: z.string().trim().min(1, "Vai trò bắt buộc"),

  status: z.enum(["Hoạt động", "Ngưng hoạt động"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),

  // Create thường bắt buộc, Update có thể bỏ trống
  password: emptyToUndefined(z.string().min(6, "Mật khẩu phải ít nhất 6 ký tự")),
};

/* =========================
 * Schemas
 * ========================= */
export const accountCreateSchema = z.object({
  ...baseAccountFields,
  status: z.literal("Hoạt động", {
    errorMap: () => ({
      message: "Không thể tạo tài khoản với trạng thái Ngưng hoạt động",
    }),
  }),

  // Tạo mới: bắt buộc có mật khẩu (override base)
  password: z.string().min(6, "Mật khẩu phải ít nhất 6 ký tự"),
});

export const accountUpdateSchema = z
  .object(baseAccountFields)
  // Update: không cho sửa username & employeeCode (giống pattern employee/department/position)
  .omit({ username: true, employeeCode: true });
