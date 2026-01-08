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

  description: emptyToUndefined(
    z
      .string()
      .trim()
      .max(500, "Mô tả tối đa 500 ký tự")
  ),

  // ⚠️ Field legacy – chỉ giữ nếu form/service còn dùng
  manager: emptyToUndefined(z.string()),

  status: z.enum(
    ["Hoạt động", "Ngưng hoạt động"],
    {
      errorMap: () => ({
        message: "Trạng thái không hợp lệ",
      }),
    }
  ),
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

  // 🔒 Không cho sửa mã phòng ban (giống employeeUpdateSchema)
  code: z.undefined().optional(),
});