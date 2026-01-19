// apps/frontend/erp-portal/src/modules/supply-chain/validations/productCategory.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields & Logic
 * ========================= */
export const baseCategoryFields = {
  name: z
    .string()
    .trim()
    .min(1, "Tên danh mục là bắt buộc")
    .max(100, "Tên danh mục tối đa 100 ký tự"),

  // parentId có thể là null (nếu là danh mục gốc) hoặc string ID
  parentId: emptyToUndefined(z.string()),

  description: emptyToUndefined(
    z.string().max(500, "Mô tả tối đa 500 ký tự")
  ),

  status: z.enum(["Hoạt động", "Ngừng hoạt động"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),
};

/* =========================
 * Custom Refinements
 * ========================= */
// Kiểm tra logic danh mục cha (nếu cần xử lý phức tạp ở client side)
// Lưu ý: Việc kiểm tra "Cha không thể là chính nó" thường cần ID của record hiện tại,
// Zod schema tĩnh khó check trừ khi truyền ID vào context hoặc body.
// Logic này đã được xử lý kỹ trong service (productCategory.service.js).

/* =========================
 * Schemas
 * ========================= */

export const productCategorySchema = z.object(baseCategoryFields);

// Schema cho tạo mới
export const productCategoryCreateSchema = z.object({
  ...baseCategoryFields,
  status: z.enum(["Hoạt động", "Ngừng hoạt động"]).default("Hoạt động"),
});

// Schema cho cập nhật (giữ nguyên base fields)
export const productCategoryUpdateSchema = z.object(baseCategoryFields);