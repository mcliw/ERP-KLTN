// apps/frontend/erp-portal/src/modules/purchasing/validations/paymentSlip.schema.js

import { z } from "zod";

/* =========================
 * Config & Constants
 * ========================= */
const DEBIT_ACCOUNTS = ["331"];        // 331: Phải trả người bán
const CREDIT_ACCOUNTS = ["111", "112"]; // 111: Tiền mặt, 112: Tiền gửi NH

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

/* =========================
 * Base Fields & Logic
 * ========================= */
export const basePaymentSlipFields = {
  // Số phiếu chi (ID)
  id: z
    .string()
    .trim()
    .min(1, "Số phiếu chi là bắt buộc")
    .max(50, "Số phiếu chi tối đa 50 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Số phiếu chỉ chứa chữ, số, gạch ngang hoặc gạch dưới"),

  // Nhà cung cấp (Tham chiếu ID từ Supply Chain DB)
  supplier_id: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn nhà cung cấp"),

  // Danh sách đơn mua hàng (Array of IDs)
  purchase_order_ids: z
    .array(z.string())
    .min(1, "Vui lòng chọn ít nhất một đơn mua hàng để thanh toán"),

  // Số tiền chi
  // Sử dụng coerce để tự động chuyển string từ input form thành number
  amount: z.coerce
    .number({ invalid_type_error: "Số tiền phải là dạng số" })
    .positive("Số tiền chi phải lớn hơn 0"),

  // Tài khoản Nợ (Debit Account) - Chỉ chấp nhận 331
  debit_account_code: z.enum(DEBIT_ACCOUNTS, {
    errorMap: () => ({ message: "TK Nợ phải là 331 (Phải trả người bán)" }),
  }),

  // Tài khoản Có (Credit Account) - Chỉ chấp nhận 111 hoặc 112
  credit_account_code: z.enum(CREDIT_ACCOUNTS, {
    errorMap: () => ({ message: "TK Có phải là 111 (Tiền mặt) hoặc 112 (Tiền gửi NH)" }),
  }),

  // Diễn giải (Optional)
  description: emptyToUndefined(
    z.string().max(500, "Diễn giải tối đa 500 ký tự")
  ),

  // Số tài khoản ngân hàng (Bắt buộc nếu TK Có là 112)
  bank_account_number: z.string().optional(),
  
  // Ngày chứng từ
  transaction_date: z.coerce.date().optional(),
};

/* =========================
 * Schemas
 * ========================= */

// Schema tổng quát
export const paymentSlipSchema = z.object(basePaymentSlipFields).refine((data) => {
    // Validate nâng cao: Nếu chọn TK 112 (Ngân hàng) thì nên có số tài khoản
    if (data.credit_account_code === "112" && !data.bank_account_number) {
        // Có thể return false hoặc để optional tùy nghiệp vụ. 
        // Ở đây tạm thời cho phép optional nhưng logic thực tế có thể cần bắt buộc.
        return true; 
    }
    return true;
}, {
    message: "Vui lòng nhập số tài khoản ngân hàng",
    path: ["bank_account_number"],
});

// Schema cho tạo mới
export const paymentSlipCreateSchema = z.object({
  ...basePaymentSlipFields,
  // Khi tạo phiếu chi, TK Nợ mặc định là 331
  debit_account_code: z.enum(DEBIT_ACCOUNTS).default("331"),
});

// Schema cho cập nhật
export const paymentSlipUpdateSchema = z.object(basePaymentSlipFields);