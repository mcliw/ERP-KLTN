// apps/frontend/erp-portal/src/modules/hrm/validations/payroll.schema.js
import { z } from "zod";

export const payrollGenerateSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Kỳ lương phải theo định dạng YYYY-MM"),
});

export const payslipItemSchema = z.object({
  employeeCode: z.string().min(1),
  baseSalary: z.number().min(0),
  allowance: z.number().min(0),
  bonus: z.number().min(0),
  deduction: z.number().min(0),
  insurance: z.number().min(0),
  tax: z.number().min(0),
  note: z.string().optional().or(z.literal("")),
});
