// apps/frontend/erp-portal/src/modules/hrm/validations/timeKeeping.schema.js

import { z } from "zod";

/* =========================
 * Helpers
 * ========================= */
const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

// Regex định dạng giờ HH:mm (VD: 08:30, 17:45)
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/* =========================
 * Base Fields
 * ========================= */
export const baseTimeKeepingFields = {
  // Với Create: bắt buộc chọn. Với Edit: thường là readonly nhưng vẫn cần validate data gửi đi
  employeeId: z.string({ required_error: "Vui lòng chọn nhân viên" }).min(1, "Vui lòng chọn nhân viên"),

  // Ngày chấm công (YYYY-MM-DD)
  date: z.string({ required_error: "Vui lòng chọn ngày" }).min(1, "Ngày chấm công bắt buộc"),

  // Giờ vào: Optional (có thể vắng mặt), check format nếu có nhập
  checkInTime: emptyToUndefined(
    z.string().regex(TIME_REGEX, "Định dạng giờ không hợp lệ (HH:mm)")
  ),

  // Giờ ra: Optional
  checkOutTime: emptyToUndefined(
    z.string().regex(TIME_REGEX, "Định dạng giờ không hợp lệ (HH:mm)")
  ),

  // Enum trạng thái
  status: z.enum(
    ["Đúng giờ", "Đi muộn", "Về sớm", "Nghỉ phép", "Vắng mặt"], 
    { errorMap: () => ({ message: "Trạng thái công không hợp lệ" }) }
  ),

  // Ghi chú
  note: emptyToUndefined(z.string().trim().max(500, "Ghi chú tối đa 500 ký tự")),
};

/* =========================
 * Refine Logic (Cross-field validation)
 * ========================= */
// Hàm kiểm tra logic: Giờ ra >= Giờ vào
const validateTimeRange = (data) => {
  if (data.checkInTime && data.checkOutTime) {
    // So sánh chuỗi dạng "HH:mm" trực tiếp (string comparison works for ISO time format)
    return data.checkOutTime >= data.checkInTime;
  }
  return true;
};

const timeRangeError = {
  message: "Giờ ra không thể nhỏ hơn giờ vào",
  path: ["checkOutTime"], // Hiển thị lỗi ở field checkOutTime
};

/* =========================
 * Schemas
 * ========================= */

// Schema cho Tạo mới
export const timeKeepingCreateSchema = z
  .object(baseTimeKeepingFields)
  .refine(validateTimeRange, timeRangeError);

// Schema cho Cập nhật
// (Có thể omit employeeId nếu API update không cho sửa người, nhưng giữ lại để validate payload an toàn)
export const timeKeepingUpdateSchema = z
  .object(baseTimeKeepingFields)
  .refine(validateTimeRange, timeRangeError);