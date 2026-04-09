// apps/frontend/erp-portal/src/modules/sales/validations/order.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Constants & Enums
 * ========================= */
const ORDER_STATUSES = ["PENDING", "COMPLETED", "CANCELLED", "SHIPPING"];

/* =========================
 * Base Fields & Logic
 * ========================= */
// 1. Schema cho từng dòng chi tiết đơn hàng (Sản phẩm)
const orderItemSchema = z.object({
  product_variant_id: z
    .string({ required_error: "Vui lòng chọn sản phẩm" })
    .min(1, "Vui lòng chọn sản phẩm"),
  
  quantity: z
    .number({ invalid_type_error: "Số lượng phải là số" })
    .int("Số lượng phải là số nguyên")
    .min(1, "Số lượng tối thiểu là 1"),
  
  price: z
    .number({ invalid_type_error: "Giá bán phải là số" })
    .min(0, "Giá bán không được âm"),
});

// 2. Schema cho thông tin chung đơn hàng (Header)
export const baseOrderFields = {
  // --- CẬP NHẬT: user_id -> customer_id ---
  customer_id: z
    .string({ required_error: "Vui lòng chọn khách hàng" })
    .min(1, "Vui lòng chọn khách hàng"),

  voucher_detail_id: emptyToUndefined(z.string()),

  // payment_id có thể null lúc tạo nếu quy trình là tạo đơn -> mới thanh toán
  payment_id: emptyToUndefined(z.string()), 

  payment_method: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn phương thức thanh toán"),

  shipping_address: z
    .string()
    .trim()
    .min(5, "Địa chỉ giao hàng quá ngắn (tối thiểu 5 ký tự)")
    .max(255, "Địa chỉ giao hàng tối đa 255 ký tự"),

  order_status: z
    .enum(ORDER_STATUSES, {
      errorMap: () => ({ message: "Trạng thái đơn hàng không hợp lệ" }),
    })
    .default("PENDING"),

  cancel_reason: z.string().optional().nullable(),
};

/* =========================
 * Schemas
 * ========================= */

// Schema dùng chung (validation cơ bản)
export const orderSchema = z.object(baseOrderFields);

// Schema cho tạo mới đơn hàng (Bắt buộc phải có danh sách sản phẩm)
export const orderCreateSchema = z.object({
  ...baseOrderFields,
  // Ghi đè status để đảm bảo khi tạo mới luôn là default (hoặc validate nếu cho phép chọn)
  order_status: z.enum(ORDER_STATUSES).default("PENDING"),
  
  // Validate danh sách items
  items: z
    .array(orderItemSchema)
    .min(1, "Đơn hàng phải có ít nhất 1 sản phẩm"),
});

// Schema cho cập nhật đơn hàng
// Thường cập nhật sẽ chỉ sửa trạng thái hoặc địa chỉ, ít khi sửa items (trừ khi logic cho phép)
export const orderUpdateSchema = z.object({
  ...baseOrderFields,
  // Khi update thì items là tùy chọn (nếu BE hỗ trợ update items) 
  // hoặc frontend không gửi items khi update status.
  items: z.array(orderItemSchema).optional(),
});