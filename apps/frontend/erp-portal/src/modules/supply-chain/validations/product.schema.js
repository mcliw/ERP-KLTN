// apps/frontend/erp-portal/src/modules/supply-chain/validations/product.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
// Chuyển chuỗi rỗng thành undefined để zod xử lý .optional() đúng cách
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields
 * ========================= */
export const baseProductFields = {
  // SKU: Yêu cầu định dạng chữ hoa, không dấu, cho phép gạch ngang
  sku: z
    .string()
    .trim()
    .min(1, "Mã SKU là bắt buộc")
    .max(50, "Mã SKU tối đa 50 ký tự")
    .regex(/^[A-Z0-9-]+$/, "Mã SKU chỉ chứa chữ cái in hoa, số và dấu gạch ngang (VD: HH-SAM-001)"),

  product_name: z
    .string()
    .trim()
    .min(1, "Tên sản phẩm là bắt buộc")
    .max(255, "Tên sản phẩm tối đa 255 ký tự"),

  // Sử dụng coerce để tự động chuyển string "1" thành number 1
  category_id: z.coerce
    .number({ invalid_type_error: "Danh mục không hợp lệ" })
    .int()
    .positive("Vui lòng chọn danh mục"),

  brand: z
    .string()
    .trim()
    .min(1, "Thương hiệu là bắt buộc (dùng để sinh SKU)"),

  unit_of_measure: emptyToUndefined(
    z.string().trim().max(20, "Đơn vị tính tối đa 20 ký tự")
  ),

  product_type: z.enum(["trading_goods", "company_asset"], {
    errorMap: () => ({ message: "Loại sản phẩm không hợp lệ" }),
  }),

  min_stock_level: z.coerce
    .number()
    .int("Tồn kho tối thiểu phải là số nguyên")
    .min(0, "Tồn kho không thể âm")
    .default(0),

  warranty_months: z.coerce
    .number()
    .int("Thời gian bảo hành phải là số nguyên")
    .min(0, "Bảo hành không thể âm")
    .default(0),

  // Validate URL nếu có nhập, nếu rỗng thì bỏ qua
  image_url: emptyToUndefined(
    z.string().trim().url("Đường dẫn ảnh không hợp lệ")
  ),
};

/* =========================
 * Schemas
 * ========================= */

// Schema cho Tạo mới
export const productCreateSchema = z.object({
  ...baseProductFields,
  // Ở bước tạo, SKU bắt buộc phải có (thường do Auto Gen điền vào)
});

// Schema cho Cập nhật
// Trong trường hợp này, ta vẫn giữ SKU trong validation 
// vì User có thể cần sửa lại SKU nếu lúc tạo bị sai sót (tuỳ policy).
// Nếu muốn cấm sửa SKU, bạn có thể dùng .omit({ sku: true })
export const productUpdateSchema = z.object({
  ...baseProductFields,
});