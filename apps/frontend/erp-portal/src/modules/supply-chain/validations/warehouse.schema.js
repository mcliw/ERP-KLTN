// apps/frontend/erp-portal/src/modules/supply-chain/validations/warehouse.schema.js

import { z } from "zod";

/* =========================
 * Config & Constants
 * ========================= */
// Các loại kho hợp lệ (Khớp với warehouse_type_enum trong DB/JSON)
const VALID_WAREHOUSE_TYPES = ["CENTRAL", "LOCAL", "TRANSIT", "BONDED", "RETAIL"];

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields & Logic
 * ========================= */
export const baseWarehouseFields = {
  // warehouse_code -> code
  code: z
    .string()
    .trim()
    .min(1, "Mã kho là bắt buộc")
    .max(20, "Mã kho tối đa 20 ký tự")
    .regex(/^[A-Z0-9-_]+$/, "Mã kho chỉ được chứa chữ hoa, số, gạch ngang và gạch dưới"), 
    // Regex optional: Giúp mã kho chuẩn ngay từ đầu (VD: WH-HNO-01)

  // warehouse_name -> name
  name: z
    .string()
    .trim()
    .min(1, "Tên kho là bắt buộc")
    .max(100, "Tên kho tối đa 100 ký tự"),

  // warehouse_type -> type
  type: z.enum(VALID_WAREHOUSE_TYPES, {
    errorMap: () => ({ message: "Loại kho không hợp lệ (Phải thuộc: CENTRAL, LOCAL, TRANSIT, BONDED, RETAIL)" }),
  }),

  // address -> address
  address: emptyToUndefined(
    z.string().max(255, "Địa chỉ tối đa 255 ký tự")
  ),

  // is_active (Boolean)
  // Khác với category (string status), warehouse dùng boolean active/inactive
  is_active: z.boolean({
    invalid_type_error: "Trạng thái hoạt động phải là đúng/sai",
  }).optional(),
};

/* =========================
 * Schemas
 * ========================= */

// Schema cơ bản
export const warehouseSchema = z.object(baseWarehouseFields);

// Schema cho tạo mới
export const warehouseCreateSchema = z.object({
  ...baseWarehouseFields,
  // Khi tạo mới, nếu không chọn active thì mặc định là true
  is_active: z.boolean().default(true),
});

// Schema cho cập nhật
export const warehouseUpdateSchema = z.object(baseWarehouseFields);