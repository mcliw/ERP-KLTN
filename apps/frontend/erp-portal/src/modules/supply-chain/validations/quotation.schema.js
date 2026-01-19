// apps/frontend/erp-portal/src/modules/supply-chain/validations/quotation.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Ngày không hợp lệ",
});

const QUOTATION_STATUS = ["PENDING", "APPROVED", "REJECTED"];

/* =========================
 * 1. Item Schema (Chi tiết báo giá) - MỚI
 * ========================= */
export const quotationItemSchema = z.object({
  product_id: z.string({ required_error: "Sản phẩm là bắt buộc" })
    .min(1, "Sản phẩm là bắt buộc"),

  // Số lượng lấy từ PR, bắt buộc phải lớn hơn 0
  quantity: z.coerce
    .number()
    .min(0.0001, "Số lượng phải lớn hơn 0"),

  // Đơn giá do NCC báo, không được âm
  unit_price: z.coerce
    .number({ invalid_type_error: "Đơn giá phải là số" })
    .min(0, "Đơn giá không được âm"),

  // Thành tiền dòng (Optional vì có thể tính toán lại)
  total_line: z.coerce.number().optional(),
});

/* =========================
 * 2. Base Fields & Logic
 * ========================= */
export const baseQuotationFields = {
  rfq_code: z
    .string({ required_error: "Mã RFQ là bắt buộc" })
    .trim()
    .min(1, "Mã RFQ là bắt buộc"),

  supplier_id: z.string({ required_error: "Vui lòng chọn nhà cung cấp" })
    .min(1, "Vui lòng chọn nhà cung cấp"),

  pr_id: z.string({ required_error: "Thiếu mã yêu cầu mua hàng" })
    .min(1, "Thiếu mã yêu cầu mua hàng (PR ID)"),

  quotation_date: dateStringSchema,

  valid_until: dateStringSchema,

  total_amount: z.coerce
    .number({ invalid_type_error: "Tổng tiền phải là số" })
    .min(0, "Tổng tiền không được âm"),

  status: z.enum(QUOTATION_STATUS).optional(),

  is_selected: z.boolean().optional(),
  
  rejection_reason: z.string().optional().nullable(),

  // --- Validate Danh sách hàng hóa (MỚI) ---
  items: z.array(quotationItemSchema)
    .min(1, "Báo giá phải có ít nhất một sản phẩm (Vui lòng chọn PR)"),
};

/* =========================
 * 3. Schemas for Forms
 * ========================= */

// Schema dùng chung/mặc định
export const quotationSchema = z.object(baseQuotationFields);

// Logic kiểm tra ngày chung
const dateRefinement = (data) => {
    if (!data.quotation_date || !data.valid_until) return true;
    return new Date(data.valid_until) >= new Date(data.quotation_date);
};

const dateRefinementParams = {
    message: "Ngày hiệu lực phải sau hoặc bằng ngày báo giá",
    path: ["valid_until"],
};

// --- Schema dùng cho Form Tạo mới ---
export const quotationCreateSchema = z.object({
  ...baseQuotationFields,
  status: z.enum(QUOTATION_STATUS).default("PENDING"),
  is_selected: z.boolean().default(false),
}).refine(dateRefinement, dateRefinementParams);

// --- Schema dùng cho Form Cập nhật ---
export const quotationUpdateSchema = z.object({
  ...baseQuotationFields,
}).refine(dateRefinement, dateRefinementParams);