// apps/frontend/erp-portal/src/modules/hrm/validations/position.schema.js

import { z } from "zod";

/* =========================
 * Constants
 * ========================= */
export const POSITION_NAME_OPTIONS = [
  "Trưởng phòng",
  "Phó phòng",
  "Trưởng nhóm",
  "Nhân viên",
  "Thực tập sinh",
];

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields
 * ========================= */
export const basePositionFields = {
  code: z
    .string()
    .trim()
    .min(1, "Mã chức vụ bắt buộc")
    .max(20, "Mã chức vụ tối đa 20 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Mã không chứa ký tự đặc biệt"),

  name: z.enum(POSITION_NAME_OPTIONS, {
    errorMap: () => ({ message: "Tên chức vụ không hợp lệ" }),
  }),

  department: z.string().min(1, "Phòng ban bắt buộc"),

  description: emptyToUndefined(z.string().trim().max(500, "Mô tả tối đa 500 ký tự")),

  capacity: z.coerce
    .number({
      invalid_type_error: "Số lượng phải là số",
    })
    .int("Số lượng phải là số nguyên")
    .min(1, "Ít nhất phải có 1 người đảm nhận"),

  status: z.enum(["Hoạt động", "Ngưng hoạt động"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),
};

/* =========================
 * Schemas
 * ========================= */
export const positionCreateSchema = z.object({
  ...basePositionFields,
  status: z.literal("Hoạt động", {
    errorMap: () => ({
      message: "Không thể tạo chức vụ với trạng thái Ngưng hoạt động",
    }),
  }),
});

export const positionUpdateSchema = z
  .object(basePositionFields)
  .omit({ code: true });
