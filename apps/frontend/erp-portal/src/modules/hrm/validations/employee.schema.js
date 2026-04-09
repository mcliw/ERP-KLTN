// apps/frontend/erp-portal/src/modules/hrm/validations/employee.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

// Chấp nhận: Base64 (upload mới) HOẶC URL (file cũ)
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

    // khuyến nghị: chỉ nhận .pdf
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
export const baseEmployeeFields = {
  code: z
    .string()
    .trim()
    .min(3, "Mã nhân viên tối thiểu 3 ký tự")
    .max(20, "Mã nhân viên tối đa 20 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Mã không chứa ký tự đặc biệt"),

  name: z.string().trim().min(2, "Họ tên bắt buộc"),

  gender: z.enum(["Nam", "Nữ", "Khác"], {
    errorMap: () => ({ message: "Vui lòng chọn giới tính" }),
  }),

  dob: emptyToUndefined(z.string()),
  hometown: emptyToUndefined(z.string()),
  cccd: emptyToUndefined(z.string().regex(/^\d{12}$/, "CCCD phải đủ 12 số")),
  email: emptyToUndefined(z.string().email("Email không hợp lệ")),
  phone: emptyToUndefined(
    z.string().regex(/^(0[3|5|7|8|9])[0-9]{8}$/, "SĐT không hợp lệ")
  ),

  bankAccount: z.string().trim().min(1, "Nhập số tài khoản"),
  bankAccountName: z.string().trim().min(1, "Nhập tên ngân hàng"),

  department: z.string().min(1, "Chọn phòng ban"),
  position: z.string().min(1, "Chọn chức vụ"),
  joinDate: z.string().min(1, "Chọn ngày vào làm"),

  status: z.enum(["Đang làm việc", "Nghỉ việc"], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" }),
  }),

  cvUrl: emptyToUndefined(pdfDataOrUrl),
  healthCertUrl: emptyToUndefined(pdfDataOrUrl),
  degreeUrl: emptyToUndefined(pdfDataOrUrl),
  contractUrl: emptyToUndefined(pdfDataOrUrl),
};

// Logic: Đang làm việc bắt buộc có Hợp đồng
const contractRefinement = (data, ctx) => {
  if (data.status === "Đang làm việc" && !data.contractUrl) {
    ctx.addIssue({
      path: ["contractUrl"],
      message: "Nhân viên đang làm việc cần có Hợp đồng lao động",
      code: z.ZodIssueCode.custom,
    });
  }
};

/* =========================
 * Schemas
 * ========================= */
export const employeeCreateSchema = z
  .object({
    ...baseEmployeeFields,
    status: z.literal("Đang làm việc", {
      errorMap: () => ({ message: "Hồ sơ mới phải là Đang làm việc" }),
    }),
  })
  .superRefine(contractRefinement);

export const employeeUpdateSchema = z
  .object(baseEmployeeFields)
  .omit({ code: true })
  .superRefine(contractRefinement);
