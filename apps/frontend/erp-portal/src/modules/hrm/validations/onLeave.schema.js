// apps/frontend/erp-portal/src/modules/hrm/validations/onLeave.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields
 * ========================= */
export const baseOnLeaveFields = {
  employeeCode: z.string().trim().min(1, "Mã nhân viên bắt buộc"),

  leaveType: z.enum(["Nghỉ phép", "Nghỉ không lương", "Nghỉ việc"], {
    errorMap: () => ({ message: "Loại nghỉ không hợp lệ" }),
  }),

  fromDate: z.string().min(1, "Ngày bắt đầu bắt buộc"),
  toDate: z.string().min(1, "Ngày kết thúc bắt buộc"),

  reason: z.string().trim().min(1, "Lý do bắt buộc").max(500, "Lý do tối đa 500 ký tự"),

  status: z.enum(["Chờ duyệt", "Đã duyệt", "Từ chối"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),

  // các field hệ thống (có thể rỗng ở form)
  approvedAt: emptyToUndefined(z.string().trim()),
  approvedBy: emptyToUndefined(z.string().trim()),
};

/* =========================
 * Business rules
 * ========================= */
const dateRangeRefinement = (data, ctx) => {
  const from = new Date(data.fromDate);
  const to = new Date(data.toDate);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toDate"],
      message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
    });
  }
};

/* =========================
 * Schemas
 * ========================= */
export const onLeaveCreateSchema = z
  .object({
    ...baseOnLeaveFields,
    status: z.literal("Chờ duyệt", {
      errorMap: () => ({ message: "Đơn mới phải ở trạng thái Chờ duyệt" }),
    }),
  })
  .superRefine(dateRangeRefinement);

export const onLeaveUpdateSchema = z
  .object(baseOnLeaveFields)
  .omit({ employeeCode: true })
  .superRefine(dateRangeRefinement);
