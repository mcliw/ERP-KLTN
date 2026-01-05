// apps/frontend/erp-portal/src/modules/hrm/validations/onLeave.schema.js

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

export const baseOnLeaveFields = {
  employeeCode: z
    .string()
    .min(1, "Mã nhân viên bắt buộc"),

  employeeName: z
    .string()
    .min(1, "Tên nhân viên bắt buộc"),

  department: z
    .string()
    .min(1, "Phòng ban bắt buộc"),

  position: z
    .string()
    .min(1, "Chức vụ bắt buộc"),

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

  reason: emptyToUndefined(z.string()),

  status: z.enum(
    ["Chờ duyệt", "Đã duyệt", "Từ chối"],
    {
      errorMap: () => ({
        message: "Trạng thái không hợp lệ",
      }),
    }
  ),
};

/* =========================
 * Business rule
 * ========================= */

const validDateRangeRule = {
  message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
  path: ["toDate"],
};

/* =========================
 * CREATE schema
 * ========================= */

export const onLeaveCreateSchema = z
  .object({
    ...baseOnLeaveFields,

    // Khi tạo mới → luôn Chờ duyệt
    status: z.literal("Chờ duyệt"),
  })
  .refine(
    (data) =>
      new Date(data.fromDate) <=
      new Date(data.toDate),
    validDateRangeRule
  );

/* =========================
 * UPDATE schema
 * ========================= */

export const onLeaveUpdateSchema = z
  .object({
    ...baseOnLeaveFields,

    // Status được phép đổi khi duyệt / từ chối
  })
  .refine(
    (data) =>
      new Date(data.fromDate) <=
      new Date(data.toDate),
    validDateRangeRule
  );