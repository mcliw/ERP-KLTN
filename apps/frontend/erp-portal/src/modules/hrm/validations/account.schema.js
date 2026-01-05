// apps/frontend/erp-portal/src/modules/hrm/validations/account.schema.js

import { z } from "zod";

/* =========================
 * Common helpers
 * ========================= */

// Cho phép "" từ input → coi như undefined
const emptyToUndefined = (schema) =>
  schema.optional().or(z.literal(""));

/* =========================
 * Base fields (shared)
 * ========================= */

export const baseAccountFields = {
  username: z
    .string()
    .trim()
    .min(1, "Tên đăng nhập bắt buộc")
    .max(30, "Tên đăng nhập quá dài"),

  employeeCode: z
    .string()
    .min(1, "Phải chọn nhân viên"),

  /**
   * Auto-fill từ employee
   * → readonly ở UI
   * → không validate business
   */
  department: emptyToUndefined(z.string()),
  position: emptyToUndefined(z.string()),

  role: z
    .string()
    .min(1, "Vai trò bắt buộc"),

  status: z.enum(["Hoạt động", "Ngưng hoạt động"], {
    errorMap: () => ({
      message: "Trạng thái không hợp lệ",
    }),
  }),
};

/* =========================
 * CREATE schema
 * ========================= */

export const accountCreateSchema = z.object({
  ...baseAccountFields,

  // Khi tạo mới → luôn hoạt động
  status: z.literal("Hoạt động", {
    errorMap: () => ({
      message:
        "Không thể tạo tài khoản với trạng thái Ngưng hoạt động",
    }),
  }),
});

/* =========================
 * UPDATE schema
 * ========================= */

export const accountUpdateSchema = z.object({
  ...baseAccountFields,

  // 🔒 Backend không cho đổi
  username: z.undefined().optional(),
  employeeCode: z.undefined().optional(),

  // auto-fill, readonly
  department: emptyToUndefined(z.string()),
  position: emptyToUndefined(z.string()),
});