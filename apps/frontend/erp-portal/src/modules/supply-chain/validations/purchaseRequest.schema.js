// apps/frontend/erp-portal/src/modules/supply-chain/validations/purchaseRequest.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

// Helper validate ngày tháng (định dạng YYYY-MM-DD)
const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Ngày không hợp lệ",
});

/* =========================
 * Constants
 * ========================= */
// Status khớp với service
const PR_STATUS = ["DRAFT", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"];

/* =========================
 * Detail Schema (PR Items)
 * ========================= */
export const prItemSchema = z.object({
  // Sử dụng z.coerce.number() để tự động chuyển string từ input html sang number
  product_id: z.coerce
    .number({ invalid_type_error: "Sản phẩm không hợp lệ" })
    .min(1, "Vui lòng chọn sản phẩm"),

  quantity_requested: z.coerce
    .number()
    .min(1, "Số lượng phải lớn hơn 0")
    .max(10000, "Số lượng quá lớn"),

  expected_date: emptyToUndefined(dateStringSchema),
});

/* =========================
 * Base Fields & Logic
 * ========================= */
export const basePurchaseRequestFields = {
  pr_code: z
    .string()
    .trim()
    .min(1, "Mã phiếu là bắt buộc")
    .max(20, "Mã phiếu tối đa 20 ký tự"),
    // .regex(/^PR-\d{4}-\d+$/, "Mã phiếu phải có dạng PR-YYYY-XXXX"), // Uncomment nếu muốn validate format cứng

  requester_id: z.coerce
    .number()
    .min(1, "Người yêu cầu là bắt buộc"),

  department_id: z.coerce
    .number()
    .min(1, "Phòng ban là bắt buộc"),

  request_date: dateStringSchema,

  reason: z
    .string()
    .trim()
    .min(5, "Lý do mua hàng cần chi tiết hơn (tối thiểu 5 ký tự)")
    .max(500, "Lý do tối đa 500 ký tự"),

  status: z.enum(PR_STATUS, {
    errorMap: () => ({ message: "Trạng thái phiếu không hợp lệ" }),
  }),

  // Validate mảng items
  items: z
    .array(prItemSchema)
    .min(1, "Cần ít nhất 1 sản phẩm trong phiếu yêu cầu"),
};

/* =========================
 * Schemas
 * ========================= */

// Schema đầy đủ (thường dùng cho validation form chung)
export const purchaseRequestSchema = z.object(basePurchaseRequestFields);

// Schema cho tạo mới
export const purchaseRequestCreateSchema = z.object({
  ...basePurchaseRequestFields,
  // Khi tạo mới, status mặc định là DRAFT, user không được chọn status khác
  status: z.enum(PR_STATUS).default("DRAFT"), 
  
  // PR Code có thể để user nhập hoặc hệ thống tự sinh (nếu tự sinh thì .optional())
  pr_code: z.string().trim().min(1, "Mã phiếu là bắt buộc"),
});

// Schema cho cập nhật
export const purchaseRequestUpdateSchema = z.object({
  ...basePurchaseRequestFields,
  // Khi update có thể cho phép sửa status (VD: Submit duyệt -> đổi sang PENDING/APPROVED)
});

// Schema chỉ để update trạng thái (Dùng cho tính năng Approve/Reject nhanh)
export const purchaseRequestStatusSchema = z.object({
  status: z.enum(PR_STATUS),
  reason: z.string().optional(), // Có thể thêm lý do duyệt/từ chối
});