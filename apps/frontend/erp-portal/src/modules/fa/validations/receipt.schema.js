// apps/frontend/erp-portal/src/modules/sales/validations/receipt.schema.js

import { z } from "zod";

/* =========================
 * Config & Constants
 * ========================= */
const DEBIT_ACCOUNTS = ["111", "112"]; // 111: Tiền mặt, 112: Tiền gửi NH
const CREDIT_ACCOUNTS = ["131"];       // 131: Phải thu khách hàng

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields & Logic
 * ========================= */
export const baseReceiptFields = {
  // Số phiếu thu (ID)
  id: z
    .string()
    .trim()
    .min(1, "Số phiếu thu là bắt buộc")
    .max(50, "Số phiếu thu tối đa 50 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Số phiếu chỉ chứa chữ, số, gạch ngang hoặc gạch dưới"),

  // Khách hàng (Tham chiếu ID từ Sales DB)
  customer_id: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn khách hàng"),

  // Đơn hàng (Tham chiếu ID từ Sales DB)
  order_id: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn đơn hàng tham chiếu"),

  // Số tiền thu
  // Sử dụng coerce để tự động chuyển string từ input form thành number
  amount: z.coerce
    .number({ invalid_type_error: "Số tiền phải là dạng số" })
    .positive("Số tiền thu phải lớn hơn 0"),

  // Tài khoản Nợ (Debit Account) - Chỉ chấp nhận 111 hoặc 112
  debit_account_code: z.enum(DEBIT_ACCOUNTS, {
    errorMap: () => ({ message: "TK Nợ phải là 111 (Tiền mặt) hoặc 112 (Tiền gửi NH)" }),
  }),

  // Tài khoản Có (Credit Account) - Chỉ chấp nhận 131
  credit_account_code: z.enum(CREDIT_ACCOUNTS, {
    errorMap: () => ({ message: "TK Có phải là 131 (Phải thu khách hàng)" }),
  }),

  // Diễn giải (Optional - Có thể để trống)
  description: emptyToUndefined(
    z.string().max(500, "Diễn giải tối đa 500 ký tự")
  ),
  
  // Ngày chứng từ (Mặc định là ngày hiện tại nếu không nhập)
  transaction_date: z.coerce.date().optional(),
};

/* =========================
 * Schemas
 * ========================= */

// Schema tổng quát
export const receiptSchema = z.object(baseReceiptFields);

// Schema cho tạo mới
export const receiptCreateSchema = z.object({
  ...baseReceiptFields,
  // Khi tạo mới, TK Có mặc định là 131 nếu không truyền lên
  credit_account_code: z.enum(CREDIT_ACCOUNTS).default("131"),
});

// Schema cho cập nhật
export const receiptUpdateSchema = z.object(baseReceiptFields);