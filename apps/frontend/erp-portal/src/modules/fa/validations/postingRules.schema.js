// apps/frontend/erp-portal/src/modules/finance/validations/postingRules.schema.js

import { z } from "zod";

/* =========================
 * Constants
 * ========================= */
// Danh sách các phân hệ nguồn hợp lệ dựa trên ngữ cảnh JSON (Purchasing, Sales...)
const MODULE_SOURCES = [
  "PURCHASING",
  "SALES",
  "HRM",
  "GENERAL"
];

/* =========================
 * Helpers
 * ========================= */
// Helper chuyển chuỗi rỗng hoặc null thành undefined
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields & Logic
 * ========================= */
export const basePostingRuleFields = {
  // event_code: Mã sự kiện (VD: GRN_CONFIRMED)
  event_code: z
    .string()
    .trim()
    .min(3, "Mã sự kiện phải có ít nhất 3 ký tự")
    .max(50, "Mã sự kiện tối đa 50 ký tự")
    // Regex cho phép chữ hoa, số và gạch dưới (Convention code thường dùng)
    .regex(/^[A-Z0-9_]+$/, "Mã sự kiện chỉ được chứa chữ in hoa, số và gạch dưới (_)"),

  // event_description: Mô tả diễn giải
  event_description: z
    .string()
    .trim()
    .min(5, "Mô tả sự kiện phải có ít nhất 5 ký tự")
    .max(200, "Mô tả sự kiện tối đa 200 ký tự"),

  // module_source: Phân hệ nguồn
  module_source: z.enum(MODULE_SOURCES, {
    errorMap: () => ({ message: "Phân hệ nguồn không hợp lệ" }),
  }),

  // debit_account_id: ID tài khoản Nợ
  debit_account_id: z
    .coerce.string({ required_error: "Vui lòng chọn tài khoản Nợ" })
    .min(1, "Vui lòng chọn tài khoản Nợ"),

  // credit_account_id: ID tài khoản Có
  credit_account_id: z
    .coerce.string({ required_error: "Vui lòng chọn tài khoản Có" })
    .min(1, "Vui lòng chọn tài khoản Có"),

  // [MỚI] Trạng thái hoạt động (Hỗ trợ Soft Delete)
  is_active: z.boolean({
    required_error: "Trạng thái hoạt động là bắt buộc",
    invalid_type_error: "Trạng thái phải là true/false",
  }).optional(), 
};

/* =========================
 * Schemas
 * ========================= */

// Logic validate chung: Nợ và Có không được trùng nhau
const refineDebitCredit = (data, ctx) => {
  if (data.debit_account_id && data.credit_account_id && data.debit_account_id === data.credit_account_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Tài khoản Nợ và Có không được trùng nhau",
      path: ["credit_account_id"], // Hiển thị lỗi ở trường Có
    });
  }
};

// Schema cơ bản (Dùng cho Validate form chung)
export const postingRuleSchema = z.object(basePostingRuleFields).superRefine(refineDebitCredit);

// Schema cho tạo mới (Create)
// Mặc định is_active là true nếu không truyền
export const postingRuleCreateSchema = z.object({
  ...basePostingRuleFields,
  is_active: z.boolean().default(true),
}).superRefine(refineDebitCredit);

// Schema cho cập nhật (Update)
export const postingRuleUpdateSchema = z.object(basePostingRuleFields).superRefine(refineDebitCredit);

/* =========================
 * Types (Optional)
 * ========================= */
// export type PostingRuleFormValues = z.infer<typeof postingRuleSchema>;