// apps/frontend/erp-portal/src/modules/supply-chain/validations/purchaseRequest.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Ngày không hợp lệ",
});

const PR_STATUS = ["DRAFT", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"];

/* =========================
 * Detail Schema (PR Items)
 * ========================= */
export const prItemSchema = z.object({
  // SỬA: Chấp nhận chuỗi cho ID sản phẩm
  product_id: z.string({ required_error: "Vui lòng chọn sản phẩm" })
    .min(1, "Vui lòng chọn sản phẩm"),

  quantity_requested: z.coerce
    .number({ invalid_type_error: "Số lượng phải là số" })
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
    .min(1, "Mã phiếu là bắt buộc"),

  // --- [FIX QUAN TRỌNG] ---
  // Chuyển sang z.string() để khớp với dữ liệu "69ca", "345d"...
  requester_id: z.string({ required_error: "Vui lòng chọn người yêu cầu" })
    .min(1, "Vui lòng chọn người yêu cầu"),

  department_id: z.string({ required_error: "Vui lòng chọn phòng ban" })
    .min(1, "Vui lòng chọn phòng ban"),
  // -------------------------

  request_date: dateStringSchema,

  reason: z.string().trim().optional(),

  status: z.enum(PR_STATUS).optional(),

  rejection_reason: z.string().optional().nullable(),

  items: z.array(prItemSchema).min(1, "Cần ít nhất 1 sản phẩm"),
};

export const purchaseRequestSchema = z.object(basePurchaseRequestFields);

export const purchaseRequestCreateSchema = z.object({
  ...basePurchaseRequestFields,
  status: z.enum(PR_STATUS).default("DRAFT"),
  pr_code: z.string().trim().min(1, "Mã phiếu là bắt buộc"),
});

export const purchaseRequestUpdateSchema = z.object({
  ...basePurchaseRequestFields,
});