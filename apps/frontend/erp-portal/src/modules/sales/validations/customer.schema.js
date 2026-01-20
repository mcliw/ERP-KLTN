// apps/frontend/erp-portal/src/modules/sales/validations/customer.schema.js

import { z } from "zod";

/* =========================
 * Config & Constants
 * ========================= */
const PHONE_REGEX = /^(0)(3|5|7|8|9)([0-9]{8})$/; // Regex đơn giản cho SĐT Việt Nam (10 số)

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields & Logic
 * ========================= */
export const baseCustomerFields = {
  // Mã khách hàng (KH001)
  code: z
    .string()
    .trim()
    .min(1, "Mã khách hàng là bắt buộc")
    .max(20, "Mã khách hàng tối đa 20 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Mã chỉ chứa chữ, số, gạch ngang hoặc gạch dưới"),

  // Họ tên / Tên công ty
  full_name: z
    .string()
    .trim()
    .min(1, "Tên khách hàng là bắt buộc")
    .max(200, "Tên khách hàng tối đa 200 ký tự"),

  // Số điện thoại
  phone: z
    .string()
    .trim()
    .min(1, "Số điện thoại là bắt buộc")
    .regex(PHONE_REGEX, "Số điện thoại không đúng định dạng (VD: 0901234567)"),

  // Email
  email: z
    .string()
    .trim()
    .min(1, "Email là bắt buộc")
    .email("Email không đúng định dạng"),

  // Địa chỉ (Có thể để trống tùy nghiệp vụ, ở đây giả định là bắt buộc nhưng cho phép chuỗi dài)
  address: z
    .string()
    .trim()
    .min(1, "Địa chỉ là bắt buộc")
    .max(500, "Địa chỉ tối đa 500 ký tự"),

  // Trạng thái (ACTIVE / INACTIVE theo JSON data)
  status: z.enum(["ACTIVE", "INACTIVE"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),
};

/* =========================
 * Schemas
 * ========================= */

// Schema tổng quát
export const customerSchema = z.object(baseCustomerFields);

// Schema cho tạo mới (Mặc định status là ACTIVE)
export const customerCreateSchema = z.object({
  ...baseCustomerFields,
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// Schema cho cập nhật
// Lưu ý: Code thường không cho sửa, nhưng nếu cho sửa thì giữ nguyên validate
export const customerUpdateSchema = z.object(baseCustomerFields);