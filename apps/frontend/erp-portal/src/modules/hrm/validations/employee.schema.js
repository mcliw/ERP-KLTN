// apps/frontend/erp-portal/src/modules/hrm/validations/employee.schema.js

import { z } from "zod";

/* =========================
 * Common helpers
 * ========================= */

const emptyToUndefined = (schema) =>
  schema.optional().or(z.literal(""));

const pdfBase64 = emptyToUndefined(
  z
    .string()
    .refine(
      (v) =>
        !v ||
        v.startsWith("data:application/pdf;base64,"),
      {
        message: "Chỉ chấp nhận file PDF",
      }
    )
);

/* =========================
 * Base fields (shared)
 * ========================= */

export const baseEmployeeFields = {
  code: z
    .string()
    .trim()
    .min(1, "Mã nhân viên bắt buộc")
    .max(20, "Mã nhân viên tối đa 20 ký tự"),

  name: z
    .string()
    .trim()
    .min(1, "Họ tên bắt buộc"),

  gender: z.enum(["Nam", "Nữ", "Khác"], {
    errorMap: () => ({ message: "Chọn giới tính" }),
  }),

  dob: emptyToUndefined(z.string()),

  hometown: emptyToUndefined(z.string()),

  cccd: emptyToUndefined(
    z.string().regex(/^\d{12}$/, "CCCD phải đủ 12 số")
  ),

  email: emptyToUndefined(
    z.string().email("Email không hợp lệ")
  ),

  phone: emptyToUndefined(
    z
      .string()
      .regex(
        /^(0[3|5|7|8|9])[0-9]{8}$/,
        "SĐT không hợp lệ"
      )
  ),

  bankAccount: z
    .string()
    .trim()
    .min(1, "Nhập số tài khoản ngân hàng"),

  bankAccountName: z
    .string()
    .trim()
    .min(1, "Nhập tên tài khoản ngân hàng"),

  department: z
    .string()
    .min(1, "Chọn phòng ban"),

  position: z
    .string()
    .min(1, "Chọn chức vụ"),

  joinDate: z
    .string()
    .min(1, "Chọn ngày vào làm"),

  status: z.enum(
    ["Đang làm việc", "Nghỉ việc"],
    {
      errorMap: () => ({
        message: "Trạng thái không hợp lệ",
      }),
    }
  ),

  cvUrl: pdfBase64,

  healthCertUrl: pdfBase64,

  degreeUrl: pdfBase64,
};

/* =========================
 * CREATE schema
 * ========================= */

export const employeeCreateSchema = z.object({
  ...baseEmployeeFields,

  // Khi tạo mới → luôn là "Đang làm việc"
  status: z.literal("Đang làm việc", {
    errorMap: () => ({
      message:
        "Không thể tạo hồ sơ với trạng thái Nghỉ việc",
    }),
  }),
});

/* =========================
 * UPDATE schema
 * ========================= */

export const employeeUpdateSchema = z.object({
  ...baseEmployeeFields,

  // Không cho sửa mã nhân viên
  code: z.undefined().optional(),
});