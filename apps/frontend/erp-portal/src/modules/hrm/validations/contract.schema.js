// apps/frontend/erp-portal/src/modules/hrm/validations/contract.schema.js

import { z } from "zod";

/* =========================
 * Common helpers
 * ========================= */

// Cho phép "" từ input → coi như undefined
const emptyToUndefined = (schema) =>
  schema.optional().or(z.literal(""));

/* =========================
 * Base fields (shared)
 * ========================= */

export const baseContractFields = {
  contractCode: z
    .string()
    .trim()
    .min(1, "Mã hợp đồng bắt buộc")
    .max(20, "Mã hợp đồng tối đa 20 ký tự"),

  employeeCode: z
    .string()
    .min(1, "Nhân viên bắt buộc"),

  /**
   * Auto-fill từ employee
   * → readonly ở UI
   * → không validate business
   */
  department: emptyToUndefined(z.string()),
  position: emptyToUndefined(z.string()),

  contractType: z.enum(
    [
      "Thử việc",
      "Xác định thời hạn",
      "Không xác định thời hạn",
    ],
    {
      errorMap: () => ({
        message: "Loại hợp đồng không hợp lệ",
      }),
    }
  ),

  startDate: z
    .string()
    .min(1, "Ngày bắt đầu bắt buộc"),

  endDate: emptyToUndefined(z.string()),

  salary: z.coerce
    .number({
      invalid_type_error: "Lương phải là số",
    })
    .positive("Lương phải lớn hơn 0"),

  status: z.enum(
    ["Hiệu lực", "Hết hạn", "Huỷ"],
    {
      errorMap: () => ({
        message: "Trạng thái không hợp lệ",
      }),
    }
  ),
};

/* =========================
 * Business rule
 * ========================= */

const requireEndDateIfNeeded = {
  message: "Hợp đồng có thời hạn phải có ngày kết thúc",
  path: ["endDate"],
};

/* =========================
 * CREATE schema
 * ========================= */

export const contractCreateSchema = z
  .object({
    ...baseContractFields,

    // Khi tạo mới → luôn Hiệu lực
    status: z.literal("Hiệu lực"),
  })
  .refine(
    (data) =>
      data.contractType ===
        "Không xác định thời hạn" ||
      Boolean(data.endDate),
    requireEndDateIfNeeded
  );

/* =========================
 * UPDATE schema
 * ========================= */

export const contractUpdateSchema = z
  .object({
    ...baseContractFields,

    // 🔒 Backend không cho đổi
    contractCode: z.undefined().optional(),
    employeeCode: z.undefined().optional(),

    // auto-fill, readonly
    department: emptyToUndefined(z.string()),
    position: emptyToUndefined(z.string()),
  })
  .refine(
    (data) =>
      data.contractType ===
        "Không xác định thời hạn" ||
      Boolean(data.endDate),
    requireEndDateIfNeeded
  );