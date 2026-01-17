// apps/frontend/erp-portal/src/modules/hrm/validations/salary.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

// Helper validate ngày tháng dạng chuỗi (YYYY-MM-DD)
const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Ngày không hợp lệ",
});

/* =========================
 * Base Fields
 * ========================= */
export const baseSalaryFields = {
  // Employee ID (Thường là string hoặc number tuỳ DB, ở đây giả định string từ select option)
  employeeId: z
    .string({ required_error: "Vui lòng chọn nhân viên" })
    .trim()
    .min(1, "Vui lòng chọn nhân viên"),

  // Lương cơ bản: Phải là số và >= 0
  baseSalary: z
    .number({ invalid_type_error: "Lương cơ bản phải là số" })
    .min(0, "Lương cơ bản không được âm")
    .refine((val) => val > 0, "Lương cơ bản phải lớn hơn 0"),

  // Phụ cấp: Có thể 0, nhưng không âm
  allowance: z
    .number({ invalid_type_error: "Phụ cấp phải là số" })
    .min(0, "Phụ cấp không được âm")
    .default(0),

  // Lương đóng BH: Có thể 0 hoặc > 0 tuỳ chính sách
  insuranceSalary: z
    .number({ invalid_type_error: "Mức lương đóng bảo hiểm phải là số"})
    .min(0, "Mức lương đóng bảo hiểm không được âm")
    .refine((val) => val > 0, "Mức lương đóng bảo hiểm phải lớn hơn 0"),

  // Ngày hiệu lực
  effectiveDate: dateStringSchema,

  // Trạng thái
  status: z.enum(["Dự thảo", "Hiệu lực", "Hết hạn"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),
};

/* =========================
 * Schemas
 * ========================= */

// Schema cho Tạo mới
export const salaryCreateSchema = z.object({
  ...baseSalaryFields,
  // Khi tạo mới, thường không được chọn ngay trạng thái "Hết hạn"
  status: z.enum(["Dự thảo", "Hiệu lực"], {
    errorMap: () => ({ message: "Trạng thái tạo mới chỉ có thể là Dự thảo hoặc Hiệu lực" }),
  }),
});

// Schema cho Cập nhật
export const salaryUpdateSchema = z.object({
  ...baseSalaryFields,
  // Khi update thì cho phép tất cả trạng thái (để set Hết hạn)
});