// apps/frontend/erp-portal/src/modules/hrm/validations/onLeave.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */

// Cho phép "" từ input → coi như undefined
const emptyToUndefined = (schema) =>
  schema.optional().or(z.literal(""));

/* =========================
 * Base fields (shared)
 * ========================= */

export const baseOnLeaveFields = {
  employeeCode: z
    .string()
    .trim()
    .min(1, "Mã nhân viên bắt buộc"),

  leaveType: z.enum(
    ["Nghỉ phép", "Nghỉ không lương", "Nghỉ việc"],
    {
      errorMap: () => ({
        message: "Loại nghỉ không hợp lệ",
      }),
    }
  ),

  fromDate: z
    .string()
    .min(1, "Ngày bắt đầu bắt buộc"),

  toDate: z
    .string()
    .min(1, "Ngày kết thúc bắt buộc"),

  reason: z
    .string()
    .trim()
    .min(1, "Lý do bắt buộc")
    .max(500, "Lý do tối đa 500 ký tự"),

  status: z.enum(
    ["Chờ duyệt", "Đã duyệt", "Từ chối"],
    {
      errorMap: () => ({
        message: "Trạng thái không hợp lệ",
      }),
    }
  ),
  approvedAt: z.string().optional(),
  approvedBy: z.string().optional(),
};

/* =========================
 * Business rules (schema-level)
 * ========================= */

const validDateRangeRule = {
  message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
  path: ["toDate"],
};

/* =========================
 * CREATE
 * ========================= */

export const onLeaveCreateSchema = z
  .object({
    ...baseOnLeaveFields,

    // Khi tạo mới → luôn Chờ duyệt
    status: z.literal("Chờ duyệt"),
  })
  .superRefine((data, ctx) => {
    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);

    if (isNaN(from) || isNaN(to) || from > to) {
      ctx.addIssue(validDateRangeRule);
    }
  });

/* =========================
 * UPDATE
 * ========================= */

export const onLeaveUpdateSchema = z
  .object(baseOnLeaveFields)
  .omit({
    employeeCode: true, // khóa nhân viên (service cũng khóa)
  })
  .superRefine((data, ctx) => {
    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);

    if (isNaN(from) || isNaN(to) || from > to) {
      ctx.addIssue(validDateRangeRule);
    }
  });