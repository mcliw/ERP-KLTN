// apps/frontend/erp-portal/src/modules/sales/validations/voucher.schema.js

import { z } from "zod";

/* =========================
 * Config & Constants
 * ========================= */
const DISCOUNT_TYPES = ["FIXED_AMOUNT", "PERCENTAGE"]; // Theo JSON data
const CODE_REGEX = /^[A-Z0-9_]+$/; // Chỉ cho phép chữ hoa, số và gạch dưới (VD: WELCOME50)

/* =========================
 * Helpers
 * ========================= */
// Chuyển chuỗi rỗng hoặc null thành undefined để Zod bỏ qua nếu là field optional
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

// Helper chuyển đổi string sang number (xử lý input type="number" trả về string)
const numberCoerce = z.coerce
  .number({ invalid_type_error: "Vui lòng nhập số" })
  .min(0, "Giá trị không được nhỏ hơn 0");

/* =========================
 * Base Fields & Logic
 * ========================= */
export const baseVoucherFields = {
  // --- Bảng voucher ---
  
  // Loại giảm giá
  discount_type: z.enum(DISCOUNT_TYPES, {
    errorMap: () => ({ message: "Loại giảm giá không hợp lệ" }),
  }),

  // Giá trị giảm (Số tiền hoặc Số phần trăm)
  discount_value: numberCoerce.min(1, "Giá trị giảm phải lớn hơn 0"),

  // Trạng thái (Map is_active từ DB sang UI STATUS)
  status: z.enum(["ACTIVE", "INACTIVE"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),

  // --- Bảng voucher_details ---
  
  // Mã giảm giá (Code)
  code: z
    .string()
    .trim()
    .min(3, "Mã voucher phải có ít nhất 3 ký tự")
    .max(50, "Mã voucher tối đa 50 ký tự")
    .regex(CODE_REGEX, "Mã chỉ chứa chữ hoa, số và gạch dưới (VD: SUMMER_2024)"),

  // --- Bảng voucher_constraints ---
  
  // Giá trị đơn hàng tối thiểu
  min_order_amount: emptyToUndefined(numberCoerce),

  // Mức giảm tối đa (Chỉ áp dụng khi giảm theo %)
  max_discount_amount: emptyToUndefined(numberCoerce),
};

/* =========================
 * Advanced Validators (Refinements)
 * ========================= */

// Logic kiểm tra chéo giữa các trường
const voucherRefinement = (data, ctx) => {
  // 1. Nếu là giảm theo phần trăm, giá trị không được quá 100
  if (data.discount_type === "PERCENTAGE" && data.discount_value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Giảm giá theo phần trăm không được vượt quá 100%",
      path: ["discount_value"],
    });
  }

  // 2. Logic về Mức giảm tối đa (Max Discount Amount)
  if (data.max_discount_amount !== undefined && data.max_discount_amount !== null) {
    // Nếu giảm theo số tiền cố định, thì max_discount_amount thường không có ý nghĩa 
    // hoặc phải lớn hơn discount_value (tùy logic, ở đây cảnh báo nếu nó nhỏ hơn)
    if (data.discount_type === "FIXED_AMOUNT" && data.max_discount_amount < data.discount_value) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mức giảm tối đa không thể nhỏ hơn giá trị giảm cố định",
        path: ["max_discount_amount"],
      });
    }
  }
};

/* =========================
 * Schemas
 * ========================= */

// Schema tổng quát cho Form (gộp cả 3 bảng)
export const voucherSchema = z.object(baseVoucherFields).superRefine(voucherRefinement);

// Schema cho tạo mới (Mặc định status ACTIVE)
export const voucherCreateSchema = z.object({
  ...baseVoucherFields,
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
}).superRefine(voucherRefinement);

// Schema cho cập nhật
// Lưu ý: Thông thường Code không cho sửa, ta có thể dùng .omit({ code: true }) nếu muốn chặt chẽ
export const voucherUpdateSchema = z.object(baseVoucherFields).superRefine(voucherRefinement);