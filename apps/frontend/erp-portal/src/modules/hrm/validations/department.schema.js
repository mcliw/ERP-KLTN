// apps/frontend/erp-portal/src/modules/hrm/validations/department.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields
 * ========================= */
export const baseDepartmentFields = {
  code: z
    .string()
    .trim()
    .min(1, "Mã phòng ban bắt buộc")
    .max(20, "Mã phòng ban tối đa 20 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Mã không chứa ký tự đặc biệt"),

  name: z.string().trim().min(1, "Tên phòng ban bắt buộc"),

  description: emptyToUndefined(z.string().trim().max(500, "Mô tả tối đa 500 ký tự")),

  // Field legacy – chỉ giữ nếu form/service còn dùng
  manager: emptyToUndefined(z.string().trim()),

  status: z.enum(["Hoạt động", "Ngưng hoạt động"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),
};

/* =========================
 * Schemas
 * ========================= */
export const departmentCreateSchema = z.object({
  ...baseDepartmentFields,
  status: z.literal("Hoạt động", {
    errorMap: () => ({
      message: "Không thể tạo phòng ban với trạng thái Ngưng hoạt động",
    }),
  }),
});

export const departmentUpdateSchema = z.object(baseDepartmentFields).omit({ code: true });
