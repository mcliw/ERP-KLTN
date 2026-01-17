// apps/frontend/erp-portal/src/modules/hrm/components/layouts/SalaryForm.jsx

import { useMemo, useEffect, useState } from "react";
// Giả định bạn đã tạo schema tương ứng
import {
  salaryCreateSchema,
  salaryUpdateSchema,
} from "../../validations/salary.schema"; 
import {
  useFormManager,
  FormInput,
  FormSelect,
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
    // Giữ nguyên số 0, chỉ thay null/undefined bằng ""
    cleaned[key] = data[key] === null || data[key] === undefined ? "" : data[key];
  });
  return cleaned;
};

const DEFAULT_FORM = {
  employeeId: "",
  baseSalary: "0",
  allowance: "0",
  insuranceSalary: "0",
  effectiveDate: "",
  status: "Dự thảo",
};

/* ==============================
 * Main Component
 * ============================== */
export default function SalaryForm({
  mode = "create",
  initialData,
  employeeOptions = [],
  onSubmit,
  onCancel,
}) {
  const toast = useToast();
  const [infoMessage, setInfoMessage] = useState("");

  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    
    // Format lại date nếu cần thiết để hiện thị đúng trong input type="date" (YYYY-MM-DD)
    if (cleaned.effectiveDate) {
      cleaned.effectiveDate = new Date(cleaned.effectiveDate).toISOString().split('T')[0];
    }
    
    return { ...DEFAULT_FORM, ...cleaned };
  }, [initialData]);

  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: mode === "create" ? salaryCreateSchema : salaryUpdateSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  useEffect(() => {
    if (initialData) {
      // Logic tái lập form khi data thay đổi từ parent (nếu có)
      // Lưu ý xử lý date format lại như trên useMemo nếu cần logic dynamic
    }
  }, [initialData]);

  // Logic nghiệp vụ: Cảnh báo nếu lương cơ bản thấp hơn mức tối thiểu vùng (Ví dụ giả định)
  useEffect(() => {
    if (form.baseSalary && Number(form.baseSalary) < 4680000) {
      setInfoMessage("Lưu ý: Lương cơ bản đang thấp hơn mức lương tối thiểu vùng (4.680.000 VNĐ).");
    } else {
      setInfoMessage("");
    }
  }, [form.baseSalary]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    // Convert numeric fields
    const submitData = {
      ...form,
      baseSalary: Number(form.baseSalary),
      allowance: Number(form.allowance),
      insuranceSalary: Number(form.insuranceSalary),
      status: form.status ?? "Dự thảo",
    };

    if (!validate(submitData)) return;

    const confirmMsg = mode === "create" 
      ? "Tạo Lương & Phúc lợi mới?" 
      : (form.status === "Hiệu lực" && initialData?.status === "Hết hạn")
        ? "Bạn có chắc chắn muốn gia hạn/kích hoạt lại hợp đồng này?"
        : "Lưu thay đổi thông tin Lương & Phúc lợi?";
      
    if (!window.confirm(confirmMsg)) return;

    onSubmit?.(submitData);
  };

  // 1. Xác định xem có nên khóa các trường nhập liệu hay không
  // Rule: Nếu đang ở chế độ Edit VÀ trạng thái hiện tại (trong form) là "Hết hạn" -> Khóa lại.
  const isInputsLocked = mode === "edit" && form.status === "Hết hạn";

  // 2. Thông báo hướng dẫn người dùng
  useEffect(() => {
    if (isInputsLocked) {
      setInfoMessage("Hợp đồng đang ở trạng thái 'Hết hạn'. Vui lòng chuyển sang 'Hiệu lực' để chỉnh sửa dữ liệu.");
    } else {
      setInfoMessage("");
    }
  }, [isInputsLocked]);

  return (
    <form className="salary-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo thông tin Lương & Phúc lợi" : "Cập nhật Lương & Phúc lợi"}</h3>

      <div className="form-grid">
        {/* Chọn Nhân viên */}
        <div style={{ gridColumn: "1 / -1" }}> {/* Full width */}
          <FormSelect
            label="Nhân viên"
            name="employeeId"
            value={form.employeeId}
            onChange={handleChange}
            required
            disabled={mode === "edit"}
            error={errors.employeeId}
          >
            <option value="">-- Chọn nhân viên --</option>
            {employeeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FormSelect>
        </div>

        {/* Cột 1: Các khoản lương */}
        <FormInput
          label="Lương cơ bản (VNĐ)"
          name="baseSalary"
          type="number"
          value={form.baseSalary}
          onChange={handleChange}
          required
          min="0"
          disabled={isInputsLocked}
          error={errors.baseSalary}
        />

        <FormInput
          label="Mức đóng bảo hiểm (VNĐ)"
          name="insuranceSalary"
          type="number"
          value={form.insuranceSalary}
          onChange={handleChange}
          required
          min="0"
          disabled={isInputsLocked}
          error={errors.insuranceSalary}
        />

        <FormInput
          label="Phụ cấp (VNĐ)"
          name="allowance"
          type="number"
          value={form.allowance}
          onChange={handleChange}
          min="0"
          disabled={isInputsLocked}
          error={errors.allowance}
        />

        {/* Cột 2: Thời gian & Trạng thái */}
        <FormInput
          label="Ngày hiệu lực"
          name="effectiveDate"
          type="date"
          value={form.effectiveDate}
          onChange={handleChange}
          required
          disabled={isInputsLocked}
          error={errors.effectiveDate}
        />

        <FormSelect
          label="Trạng thái"
          name="status"
          value={form.status}
          onChange={handleChange}
          error={errors.status}
        >
          <option value="Dự thảo">Dự thảo</option>
          <option value="Hiệu lực">Hiệu lực</option>
          <option value="Hết hạn">Hết hạn</option>
        </FormSelect>
      </div>

      {infoMessage && (
        <div className="alert alert-warning mt-3" style={{color: "#dc2626", marginTop: 8}}>
          <i className="fa fa-info-circle me-2"></i>
          {infoMessage}
        </div>
      )}

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo mới" : "Lưu thay đổi"}
      />
    </form>
  );
}