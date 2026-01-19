// apps/frontend/erp-portal/src/modules/supply-chain/validations/inventory.schema.js

import { z } from "zod";

/* =========================
 * Config & Constants
 * ========================= */
// Các loại giao dịch kho (Nếu cần validate transaction log sau này)
export const TRANSACTION_TYPES = ["INBOUND", "OUTBOUND", "ADJUSTMENT", "TRANSFER"];

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields & Logic
 * ========================= */
export const baseInventoryFields = {
  // warehouse_id (Foreign Key)
  warehouse_id: z.coerce
    .number({ invalid_type_error: "Kho hàng là bắt buộc" })
    .int()
    .positive("Vui lòng chọn kho hàng hợp lệ"),

  // bin_id (Foreign Key)
  bin_id: z.coerce
    .number({ invalid_type_error: "Vị trí kho là bắt buộc" })
    .int()
    .positive("Vui lòng chọn vị trí kho (Bin)"),

  // product_id (Foreign Key)
  product_id: z.coerce
    .number({ invalid_type_error: "Sản phẩm là bắt buộc" })
    .int()
    .positive("Vui lòng chọn sản phẩm"),

  // quantity_on_hand (Tổng số lượng thực tế trong kho)
  quantity_on_hand: z.coerce
    .number({ invalid_type_error: "Số lượng phải là số" })
    .int("Số lượng phải là số nguyên")
    .min(0, "Số lượng tồn kho không được âm"),

  // quantity_allocated (Số lượng đang được giữ/đặt trước)
  quantity_allocated: z.coerce
    .number()
    .int("Số lượng cấp phát phải là số nguyên")
    .min(0, "Số lượng cấp phát không được âm")
    .default(0), // Mặc định là 0 nếu không gửi lên
};

/* =========================
 * Schemas
 * ========================= */

// Schema cơ bản (Dùng để hiển thị hoặc validate object đầy đủ)
export const inventorySchema = z.object({
  id: z.number(),
  ...baseInventoryFields,
  // quantity_available thường được tính toán (on_hand - allocated), 
  // nhưng nếu BE trả về thì validate nó.
  quantity_available: z.number().int().optional(),
  updatedAt: z.string().datetime().optional(),
});

// Schema cho tạo mới (Initial Stock)
export const inventoryCreateSchema = z.object({
  ...baseInventoryFields,
}).refine((data) => data.quantity_on_hand >= data.quantity_allocated, {
  message: "Số lượng tồn kho phải lớn hơn hoặc bằng số lượng đã cấp phát",
  path: ["quantity_on_hand"], // Hiển thị lỗi ở trường on_hand
});

// Schema cho cập nhật (Stock Adjustment / Correction)
export const inventoryUpdateSchema = z.object({
  // Khi update, thường user không đổi product/warehouse/bin mà chỉ đổi số lượng.
  // Tuy nhiên, giữ lại baseFields để validate nếu payload gửi đầy đủ.
  ...baseInventoryFields,
}).refine((data) => data.quantity_on_hand >= data.quantity_allocated, {
  message: "Số lượng tồn kho không thể nhỏ hơn số lượng đang được giữ (allocated)",
  path: ["quantity_on_hand"],
});

// Schema cho Transaction (Bổ sung thêm dựa trên json inventory_transaction_logs)
export const transactionLogSchema = z.object({
  type: z.enum(TRANSACTION_TYPES, {
    errorMap: () => ({ message: "Loại giao dịch không hợp lệ" }),
  }),
  product_id: z.coerce.number().positive(),
  warehouse_id: z.coerce.number().positive(),
  bin_id: z.coerce.number().positive(),
  quantity_change: z.coerce.number().int().refine((val) => val !== 0, {
    message: "Số lượng thay đổi phải khác 0",
  }),
  reference_code: z.string().max(50).optional(),
  transaction_date: z.string().datetime().optional(),
});