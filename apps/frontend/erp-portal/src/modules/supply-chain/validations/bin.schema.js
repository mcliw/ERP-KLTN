// apps/frontend/erp-portal/src/modules/supply-chain/validations/bin.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields & Logic
 * ========================= */
export const baseBinFields = {
  // warehouse_id (Foreign Key)
  // Sử dụng coerce để tự động ép kiểu string "1" -> number 1 từ form select
  warehouse_id: z.coerce
    .number({ invalid_type_error: "Vui lòng chọn kho hàng hợp lệ" })
    .int("ID kho phải là số nguyên")
    .positive("Vui lòng chọn kho hàng"),

  // bin_code -> code
  code: z
    .string()
    .trim()
    .min(1, "Mã vị trí là bắt buộc")
    .max(20, "Mã vị trí tối đa 20 ký tự")
    // Regex: Cho phép chữ hoa, số, gạch ngang. Ví dụ: A-01-01, DISP-01
    .regex(/^[A-Z0-9-]+$/, "Mã vị trí chỉ được chứa chữ hoa, số và gạch ngang (VD: A-01-01)"),

  // max_capacity
  // Sức chứa tối đa (VD: 500 items). Nếu form bỏ trống sẽ default về 0 hoặc bắt nhập
  max_capacity: z.coerce
    .number({ invalid_type_error: "Sức chứa phải là một số" })
    .int("Sức chứa phải là số nguyên")
    .min(0, "Sức chứa không được âm"),
  
  // Description/Note (Tuỳ chọn - dựa trên các field thường gặp dù JSON chưa có)
  description: emptyToUndefined(
    z.string().max(255, "Mô tả tối đa 255 ký tự")
  ),

  is_active: z.boolean({
    invalid_type_error: "Trạng thái hoạt động phải là đúng/sai",
  }).optional(),
};

/* =========================
 * Schemas
 * ========================= */

// Schema cơ bản
export const binSchema = z.object(baseBinFields);

// Schema cho tạo mới
export const binCreateSchema = z.object({
  ...baseBinFields,
  // Khi tạo mới, nếu người dùng không nhập sức chứa, có thể mặc định là 0 hoặc một số chuẩn
  max_capacity: baseBinFields.max_capacity.default(0),
  is_active: z.boolean().default(true),
});

// Schema cho cập nhật
export const binUpdateSchema = z.object(baseBinFields);