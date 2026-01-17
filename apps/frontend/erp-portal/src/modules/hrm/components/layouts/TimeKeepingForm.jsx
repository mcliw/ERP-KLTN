// apps/frontend/erp-portal/src/modules/hrm/components/layouts/TimeKeepingForm.jsx

import { useMemo, useEffect, useState } from "react";
// Giả định bạn đã có file schema này, nếu chưa có hãy tạo file tương ứng
import {
  timeKeepingCreateSchema,
  timeKeepingUpdateSchema,
} from "../../validations/timeKeeping.schema";
import {
  useFormManager,
  FormInput,
  FormSelect,
  FormTextarea,
  FormActions,
} from "../common/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";

/* ==============================
 * Helpers & Configs
 * ============================== */
const cleanData = (data) => {
  if (!data) return {};
  const cleaned = {};
  Object.keys(data).forEach((key) => {
    cleaned[key] = data[key] === null || data[key] === undefined ? "" : data[key];
  });
  return cleaned;
};

// Form mặc định cho chấm công
const DEFAULT_FORM = {
  employeeId: "",
  date: new Date().toISOString().split('T')[0], // Mặc định hôm nay
  checkInTime: "",
  checkOutTime: "",
  status: "Đúng giờ", // Enum: Đúng giờ, Đi muộn, Về sớm, Vắng...
  note: "",
};

/* ==============================
 * Main Component
 * ============================== */
export default function TimeKeepingForm({
  mode = "create",
  initialData,
  employeeOptions = [], // Danh sách nhân viên để chọn (cho mode create)
  onSubmit,
  onCancel,
}) {
  const toast = useToast();

  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return { ...DEFAULT_FORM, ...cleaned };
  }, [initialData]);

  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: mode === "create" ? timeKeepingCreateSchema : timeKeepingUpdateSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  // Load data khi edit
  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({ ...prev, ...cleanData(initialData) }));
    }
  }, [initialData, setForm]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    // Logic nghiệp vụ: Giờ ra không được nhỏ hơn giờ vào
    if (form.checkInTime && form.checkOutTime) {
        if (form.checkOutTime < form.checkInTime) {
            toast.error("Giờ ra không thể nhỏ hơn giờ vào.");
            return;
        }
    }

    const submitData = {
      employeeId: form.employeeId,
      date: form.date,
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      status: form.status,
      note: form.note,
    };

    if (!validate(submitData)) return;

    if (!window.confirm(mode === "create" ? "Tạo bảng công?" : "Lưu thay đổi chấm công?"))
      return;

    onSubmit?.(submitData);
  };

  return (
    <form className="timekeeping-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Thêm mới chấm công" : "Cập nhật chấm công"}</h3>

      <div className="form-grid">
        
        {/* Chọn nhân viên: Chỉ cho phép chọn khi tạo mới */}
        {mode === "create" ? (
             <FormSelect
             label="Nhân viên"
             name="employeeId"
             value={form.employeeId}
             onChange={handleChange}
             required
             error={errors.employeeId}
           >
             <option value="">-- Chọn nhân viên --</option>
             {employeeOptions.map((emp) => (
                <option key={emp.id} value={emp.id}>
                    {emp.code} - {emp.name}
                </option>
             ))}
           </FormSelect>
        ) : (
            // Khi edit, hiển thị tên nhân viên dưới dạng disabled input hoặc text
            <FormInput
                label="Nhân viên"
                name="employeeName" // Giả sử initialData có field này để hiển thị
                value={initialData?.employeeName || form.employeeId} 
                disabled
                readOnly
            />
        )}

        <FormInput
          label="Ngày chấm công"
          name="date"
          type="date"
          value={form.date}
          onChange={handleChange}
          required
          // Thường thì ngày công cũng hạn chế sửa nếu đã chốt, ở đây tạm để disabled khi edit
          disabled={mode === "edit"} 
          error={errors.date}
        />

        <FormInput
          label="Giờ vào"
          name="checkInTime"
          type="time" // HTML5 Time input
          value={form.checkInTime}
          onChange={handleChange}
          error={errors.checkInTime}
        />

        <FormInput
          label="Giờ ra"
          name="checkOutTime"
          type="time" // HTML5 Time input
          value={form.checkOutTime}
          onChange={handleChange}
          error={errors.checkOutTime}
        />

        <FormSelect
          label="Trạng thái"
          name="status"
          value={form.status}
          onChange={handleChange}
          error={errors.status}
        >
          <option value="Đúng giờ">Đúng giờ</option>
          <option value="Đi muộn">Đi muộn</option>
          <option value="Về sớm">Về sớm</option>
          <option value="Nghỉ phép">Nghỉ phép</option>
          <option value="Vắng mặt">Vắng mặt</option>
        </FormSelect>

        <FormTextarea
          label="Ghi chú / Giải trình"
          name="note"
          value={form.note}
          onChange={handleChange}
          rows={3}
          error={errors.note}
        />
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo mới" : "Lưu thay đổi"}
      />
    </form>
  );
}