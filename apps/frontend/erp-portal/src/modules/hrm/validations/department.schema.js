// apps/frontend/erp-portal/src/modules/hrm/validations/department.schema.js

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

export const baseDepartmentFields = {
  code: z
    .string()
    .trim()
    .min(1, "Mã phòng ban bắt buộc")
    .max(20, "Mã phòng ban tối đa 20 ký tự"),

  name: z
    .string()
    .trim()
    .min(1, "Tên phòng ban bắt buộc"),

  // Người quản lý (có thể chưa chọn)
  manager: emptyToUndefined(z.string()),

  status: z.enum(["Hoạt động", "Ngưng hoạt động"], {
    errorMap: () => ({
      message: "Trạng thái không hợp lệ",
    }),
  }),
};

/* =========================
 * CREATE schema
 * ========================= */

export const departmentCreateSchema = z.object({
  ...baseDepartmentFields,

  // Khi tạo mới → luôn Hoạt động
  status: z.literal("Hoạt động", {
    errorMap: () => ({
      message:
        "Không thể tạo phòng ban với trạng thái Ngưng hoạt động",
    }),
  }),
});

/* =========================
 * UPDATE schema
 * ========================= */

export const departmentUpdateSchema = z.object({
  ...baseDepartmentFields,

  // 🔒 Không cho sửa mã phòng ban
  code: z.undefined().optional(),
});