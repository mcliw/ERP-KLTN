// apps/frontend/erp-portal/src/modules/supply-chain/validations/purchaseOrder.schema.js

import { z } from "zod";

/* =========================
 * Constants & Helpers
 * ========================= */
const PO_STATUS = ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"];

// Helper check ngày tháng hợp lệ (Format YYYY-MM-DD)
const dateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: "Ngày không hợp lệ (Định dạng YYYY-MM-DD)",
});

/* =========================
 * 1. Item Schema (Chi tiết hàng hóa)
 * ========================= */
export const poItemFields = {
  // Trong JSON: prod_101 (String)
  product_id: z.string({ required_error: "Vui lòng chọn sản phẩm" })
    .min(1, "Sản phẩm là bắt buộc"),

  // Trong JSON: 2 (Number)
  quantity_ordered: z.coerce
    .number()
    .min(1, "Số lượng đặt phải lớn hơn 0"),

  // Trong JSON: 20000000 (Number)
  unit_price: z.coerce
    .number()
    .min(0, "Đơn giá không được âm"),

  // Thành tiền dòng (Optional vì thường sẽ tự tính toán)
  total_line_amount: z.coerce.number().optional(),
  
  // Ghi chú thêm (nếu cần mở rộng sau này)
  note: z.string().optional(),
};

export const poItemSchema = z.object(poItemFields);

/* =========================
 * 2. Base PO Fields (Thông tin chung)
 * ========================= */
export const basePOFields = {
  // Trong JSON: PO-2023-500
  po_code: z
    .string({ required_error: "Mã đơn mua hàng là bắt buộc" })
    .trim()
    .min(1, "Mã đơn mua hàng không được để trống"),

  // Trong JSON: "102" (String reference)
  quotation_id: z.string({ required_error: "Phải tham chiếu từ một báo giá" })
    .min(1, "Mã báo giá là bắt buộc"),

  // Trong JSON: "2" (String reference)
  supplier_id: z.string({ required_error: "Vui lòng chọn nhà cung cấp" })
    .min(1, "Vui lòng chọn nhà cung cấp"),

  // Trong JSON: 2023-10-06
  order_date: dateStringSchema,

  // Trong JSON: 2023-10-15
  expected_delivery_date: dateStringSchema,

  // Các trường tiền tệ
  total_amount: z.coerce
    .number()
    .min(0, "Tổng tiền không được âm"),

  tax_amount: z.coerce
    .number()
    .min(0)
    .default(0),

  discount_amount: z.coerce
    .number()
    .min(0)
    .default(0),

  status: z.enum(PO_STATUS).optional(),

  // Trong JSON: "99" (String) -> Cần sửa lại schema cũ đang để number
  approved_by: z.string().nullable().optional(),

  // Validate danh sách items trong Form (Dù API lưu riêng nhưng Form cần submit chung)
  items: z.array(poItemSchema).min(1, "Đơn hàng phải có ít nhất một mặt hàng"),
};

/* =========================
 * 3. Form Schemas (Create/Update)
 * ========================= */

// Logic chung: Ngày giao hàng >= Ngày đặt hàng
const dateValidationRefinement = (data) => {
    if (!data.order_date || !data.expected_delivery_date) return true;
    const orderDate = new Date(data.order_date);
    const deliveryDate = new Date(data.expected_delivery_date);
    // Cho phép giao trong ngày (>=)
    return deliveryDate.getTime() >= orderDate.getTime();
};

const dateValidationMessage = {
    message: "Ngày dự kiến giao hàng không được trước ngày đặt hàng",
    path: ["expected_delivery_date"],
};

// --- Schema Tạo mới ---
export const poCreateSchema = z.object({
  ...basePOFields,
  status: z.enum(PO_STATUS).default("PENDING"),
}).refine(dateValidationRefinement, dateValidationMessage);

// --- Schema Cập nhật ---
export const poUpdateSchema = z.object({
  ...basePOFields,
}).refine(dateValidationRefinement, dateValidationMessage);

/* =========================
 * 4. Utilities (Hỗ trợ tính toán UI)
 * ========================= */

/**
 * Tính toán lại tổng tiền PO dựa trên danh sách items.
 * Dùng để cập nhật UI realtime khi người dùng sửa số lượng/đơn giá.
 */
export const calculatePOTotal = (items = [], taxRate = 0.1, discount = 0) => {
  if (!Array.isArray(items)) return { subtotal: 0, taxAmount: 0, totalAmount: 0 };

  // 1. Tính tổng tiền hàng (Trước thuế)
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity_ordered) || 0;
    const price = Number(item.unit_price) || 0;
    return sum + (qty * price);
  }, 0);

  // 2. Tính thuế (Mặc định 10% hoặc 8% tùy cấu hình, ở đây giả sử tham số taxRate)
  // Trong JSON: total_amount = 44.5tr, tax = 4.45tr => Rate ~ 10%
  const taxAmount = Math.round(subtotal * taxRate);

  // 3. Tổng cộng
  const totalAmount = subtotal + taxAmount - (Number(discount) || 0);

  return {
    subtotal,    // Tổng tiền hàng
    taxAmount,   // Tiền thuế
    totalAmount  // Tổng thanh toán
  };
};