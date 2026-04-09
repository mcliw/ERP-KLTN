// apps/frontend/erp-portal/src/modules/sales/components/layouts/CustomerForm.jsx

import { useMemo, useEffect } from "react";
import { customerSchema } from "../../validations/customer.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
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

const DEFAULT_FORM = {
  code: "",
  full_name: "",
  phone: "",
  email: "",
  address: "",
  status: "ACTIVE",
};

/* ==============================
 * Main Component
 * ============================== */
export default function CustomerForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const toast = useToast();

  // Khởi tạo giá trị form
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return {
      ...DEFAULT_FORM,
      ...cleaned,
    };
  }, [initialData]);

  // Hook quản lý form
  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: customerSchema,
  });

  const isDirty = useMemo(() => {
    // So sánh đơn giản để biết form có thay đổi không
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  // Reset form khi initialData thay đổi
  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({
        ...prev,
        ...cleanData(initialData),
      }));
    }
  }, [initialData, setForm]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    // Validate toàn bộ form dựa trên Zod schema
    if (!validate(form)) return;

    if (!window.confirm(mode === "create" ? "Thêm mới khách hàng này?" : "Lưu các thay đổi?")) return;

    onSubmit?.(form);
  };

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Thêm mới khách hàng" : "Cập nhật thông tin khách hàng"}</h3>

      {/* Main Info */}
      <div className="form-grid">
        {/* Mã khách hàng: ReadOnly khi Edit */}
        <FormInput
          label="Mã khách hàng"
          name="code"
          value={form.code}
          onChange={handleChange}
          required
          error={errors.code}
          placeholder="VD: KH001"
          readOnly={mode === "edit"}
          disabled={mode === "edit"}
          style={mode === "edit" ? { backgroundColor: "#f3f4f6" } : {}}
        />

        <FormInput
          label="Họ và tên"
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          required
          error={errors.full_name}
          placeholder="VD: Nguyễn Văn A"
        />

        <FormInput
          label="Số điện thoại"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
          error={errors.phone}
          placeholder="VD: 0901234567"
        />

        <FormInput
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          error={errors.email}
          placeholder="VD: email@example.com"
        />

        <FormSelect 
            label="Trạng thái" 
            name="status" 
            value={form.status} 
            onChange={handleChange}
        >
          <option value="ACTIVE">Hoạt động (Active)</option>
          <option value="INACTIVE">Ngừng hoạt động (Inactive)</option>
        </FormSelect>
        
        {/* Placeholder rỗng để đẩy Address xuống dòng dưới hoặc lấp đầy grid 2 cột */}
        <div className="hidden md:block"></div>

        {/* Địa chỉ - Full width */}
        <div style={{ gridColumn: "1 / -1" }}>
            <FormInput
            label="Địa chỉ"
            name="address"
            value={form.address}
            onChange={handleChange}
            error={errors.address}
            placeholder="Số nhà, đường, phường/xã..."
            />
        </div>
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Thêm khách hàng" : "Lưu thay đổi"}
      />
    </form>
  );
}