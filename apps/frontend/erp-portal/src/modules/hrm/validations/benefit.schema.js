// apps/frontend/erp-portal/src/modules/hrm/validations/benefit.schema.js
import { z } from "zod";

export const benefitSchema = z.object({
  code: z.string().min(1, "Mã phúc lợi bắt buộc").max(20),
  name: z.string().min(1, "Tên phúc lợi bắt buộc"),
  type: z.enum(["Phụ cấp", "Bảo hiểm", "Thưởng", "Khác"]),
  amount: z.number().min(0, "Số tiền phải >= 0"),
  status: z.enum(["Hoạt động", "Ngưng hoạt động"]),
});

export const benefitAssignSchema = z.object({
  employeeCode: z.string().min(1, "Mã nhân viên bắt buộc"),
  benefitCode: z.string().min(1, "Mã phúc lợi bắt buộc"),
  effectiveFrom: z.string().min(1, "Ngày hiệu lực bắt buộc"),
  effectiveTo: z.string().optional().or(z.literal("")),
});
