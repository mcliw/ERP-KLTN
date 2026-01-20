// apps/frontend/erp-portal/src/modules/finance/validations/faAccount.schema.js

import { z } from "zod";

/* =========================
 * Constants
 * ========================= */
// Danh sách loại tài khoản hợp lệ dựa trên JSON mẫu
const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

/* =========================
 * Helpers
 * ========================= */
// Helper chuyển chuỗi rỗng hoặc null thành undefined để Zod bỏ qua validation nếu optional
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields & Logic
 * ========================= */
export const baseAccountFields = {
  account_code: z
    .string()
    .trim()
    .min(3, "Số hiệu tài khoản phải có ít nhất 3 ký tự")
    .max(20, "Số hiệu tài khoản tối đa 20 ký tự")
    .regex(/^[a-zA-Z0-9]+$/, "Số hiệu tài khoản chỉ được chứa chữ và số"),

  account_name: z
    .string()
    .trim()
    .min(1, "Tên tài khoản là bắt buộc")
    .max(200, "Tên tài khoản tối đa 200 ký tự"),

  account_type: z.enum(ACCOUNT_TYPES, {
    errorMap: () => ({ message: "Loại tài khoản không hợp lệ" }),
  }),

  // parent_account_id: Xử lý input từ Select (thường là string) hoặc null
  // Dùng coerce.number() để ép kiểu string "1" thành number 1 nếu có giá trị
  parent_account_id: emptyToUndefined(
    z.coerce.number({ invalid_type_error: "ID tài khoản cha phải là số" })
  ),

  is_active: z.boolean({
    required_error: "Trạng thái hoạt động là bắt buộc",
    invalid_type_error: "Trạng thái phải là true/false",
  }),
};

/* =========================
 * Schemas
 * ========================= */

// Schema cơ bản
export const faAccountSchema = z.object(baseAccountFields);

// Schema cho tạo mới (Create)
// Mặc định is_active là true nếu không truyền
export const faAccountCreateSchema = z.object({
  ...baseAccountFields,
  is_active: z.boolean().default(true),
});

// Schema cho cập nhật (Update)
// Giữ nguyên các rules cơ bản, parent_account_id có thể null
export const faAccountUpdateSchema = z.object(baseAccountFields);

/* =========================
 * Types (Optional: Export TypeScript type inferred from Zod)
 * ========================= */
// export type FaAccountFormValues = z.infer<typeof faAccountSchema>;