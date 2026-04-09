// apps/frontend/erp-portal/src/modules/supply-chain/validations/supplier.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

// Tái sử dụng logic kiểm tra file PDF (Base64 hoặc URL)
const pdfDataOrUrl = z.string().superRefine((val, ctx) => {
  if (!val) return;

  // Base64
  if (val.startsWith("data:")) {
    if (!val.startsWith("data:application/pdf;base64,")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chỉ chấp nhận file định dạng PDF",
      });
    }
    return;
  }

  // URL
  try {
    const u = new URL(val);
    if (!/^https?:$/.test(u.protocol)) throw new Error("BAD_PROTOCOL");

    if (!u.pathname.toLowerCase().endsWith(".pdf")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File phải là PDF (.pdf)",
      });
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Link file không hợp lệ",
    });
  }
});

/* =========================
 * Base Fields & Logic
 * ========================= */
export const baseSupplierFields = {
  code: z
    .string()
    .trim()
    .min(3, "Mã nhà cung cấp tối thiểu 3 ký tự")
    .max(20, "Mã nhà cung cấp tối đa 20 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Mã không chứa ký tự đặc biệt"),

  name: z.string().trim().min(2, "Tên nhà cung cấp bắt buộc"),

  // Validate Mã số thuế VN: 10 số hoặc 13 số (10 số + dấu gạch + 3 số)
  taxCode: z
    .string()
    .trim()
    .regex(/^[0-9]{10}(-[0-9]{3})?$/, "Mã số thuế không hợp lệ (VD: 0101234567)"),

  contactEmail: emptyToUndefined(z.string().email("Email liên hệ không hợp lệ")),

  // SĐT nhà cung cấp chấp nhận cả máy bàn (đầu 02) và di động: 10-11 số
  contactPhone: emptyToUndefined(
    z.string().regex(/^0\d{9,10}$/, "SĐT không hợp lệ (10-11 số)")
  ),

  address: z.string().trim().min(5, "Địa chỉ bắt buộc nhập chi tiết"),

  financePartnerId: emptyToUndefined(z.number().int().positive()),

  rating: emptyToUndefined(z.number().min(0).max(5)),

  note: emptyToUndefined(z.string().max(500, "Ghi chú tối đa 500 ký tự")),

  status: z.enum(["Đang hợp tác", "Dừng hợp tác"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),

  contractUrl: emptyToUndefined(pdfDataOrUrl),
};

// Logic: "Đang hợp tác" bắt buộc phải có Hợp đồng (file đính kèm)
const contractRefinement = (data, ctx) => {
  if (data.status === "Đang hợp tác" && !data.contractUrl) {
    ctx.addIssue({
      path: ["contractUrl"],
      message: "Nhà cung cấp đang hợp tác cần có Hợp đồng",
      code: z.ZodIssueCode.custom,
    });
  }
};

/* =========================
 * Schemas
 * ========================= */
export const supplierCreateSchema = z
  .object({
    ...baseSupplierFields,
    // Khi tạo mới, thường mặc định là Đang hợp tác
    status: z.literal("Đang hợp tác", {
      errorMap: () => ({ message: "Nhà cung cấp mới phải là Đang hợp tác" }),
    }),
  })
  .superRefine(contractRefinement);

export const supplierUpdateSchema = z
  .object(baseSupplierFields)
  .omit({ code: true }) // Không cho phép sửa mã code
  .superRefine(contractRefinement);