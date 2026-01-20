// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/BinForm.jsx

import { useMemo, useEffect } from "react";
import { binSchema } from "../../validations/bin.schema"; // Import schema của Bin
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";

/* ==============================
 * Helpers & Configs
 * ============================== */
const cleanData = (data) => {
  if (!data) return {};
  const cleaned = {};
  Object.keys(data).forEach((key) => {
    // Giữ nguyên kiểu boolean hoặc number (để tránh 0 bị biến thành "")
    if (typeof data[key] === "boolean" || typeof data[key] === "number") {
        cleaned[key] = data[key];
    } else {
        cleaned[key] = data[key] === null || data[key] === undefined ? "" : data[key];
    }
  });
  return cleaned;
};

const DEFAULT_FORM = {
  code: "",
  warehouse_id: "", // Giá trị rỗng ban đầu để ép người dùng chọn
  max_capacity: 0,  // Mặc định sức chứa là 0
  description: "",
  is_active: true,
};

/* ==============================
 * Main Component
 * ============================== */
export default function BinForm({ 
    mode = "create", 
    initialData, 
    warehouseOptions = [], // Danh sách kho hàng { value, label } truyền từ cha
    onSubmit, 
    onCancel 
}) {
  const toast = useToast();

  // Khởi tạo giá trị form
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return {
      ...DEFAULT_FORM,
      ...cleaned,
      // Đảm bảo warehouse_id khớp kiểu dữ liệu (nếu option value là string)
      warehouse_id: cleaned.warehouse_id ? String(cleaned.warehouse_id) : "",
    };
  }, [initialData]);

  // Hook quản lý form
  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: binSchema,
  });

  const isDirty = useMemo(() => {
    // So sánh form hiện tại với initialValues
    // Cần convert số sang string khi so sánh nếu form input đang lưu dạng string
    const currentFormState = {
        ...form,
        warehouse_id: String(form.warehouse_id),
        max_capacity: Number(form.max_capacity)
    };
    const initialState = {
        ...safeInitialValues,
        warehouse_id: String(safeInitialValues.warehouse_id),
        max_capacity: Number(safeInitialValues.max_capacity)
    };
    return JSON.stringify(currentFormState) !== JSON.stringify(initialState);
  }, [form, safeInitialValues]);

  const handleStatusChange = (e) => {
    const value = e.target.value === "true"; 
    setForm(prev => ({ ...prev, is_active: value }));
  };

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

    // Validate trước khi submit
    if (!validate(form)) return;

    // Confirm dialog
    const confirmMsg = mode === "create" 
        ? "Xác nhận tạo vị trí kho mới?" 
        : "Lưu các thay đổi thông tin vị trí?";
    if (!window.confirm(confirmMsg)) return;

    // Chuyển đổi dữ liệu số trước khi gửi
    const submitData = {
        ...form,
        warehouse_id: Number(form.warehouse_id),
        max_capacity: Number(form.max_capacity)
    };

    onSubmit?.(submitData);
  };

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo vị trí lưu kho" : "Cập nhật thông tin vị trí"}</h3>

      {/* Main Info */}
      <div className="form-grid">
        {/* Row 1: Warehouse & Code */}
        {/* Chọn kho hàng - Quan trọng nhất */}
        <FormSelect
          label="Thuộc kho hàng"
          name="warehouse_id"
          value={form.warehouse_id}
          onChange={handleChange}
          required
          error={errors.warehouse_id}
          // Nếu đang edit, thường hạn chế chuyển vị trí sang kho khác để tránh lỗi dữ liệu tồn kho
          disabled={mode === "edit"} 
          style={mode === "edit" ? { backgroundColor: "#f3f4f6" } : {}}
        >
          <option value="">-- Chọn kho hàng --</option>
          {warehouseOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FormSelect>

        <FormInput
          label="Mã vị trí"
          name="code"
          value={form.code}
          onChange={handleChange}
          required
          error={errors.code}
          placeholder="VD: A-01-01, DISP-01"
          // Tương tự kho, mã vị trí là định danh, hạn chế sửa khi edit
          readOnly={mode === "edit"} 
          disabled={mode === "edit"}
          style={mode === "edit" ? { backgroundColor: "#f3f4f6" } : {}}
        />

        {/* Row 2: Capacity & Description */}
        <FormInput
          label="Sức chứa tối đa (Items)"
          name="max_capacity"
          type="number"
          value={form.max_capacity}
          onChange={handleChange}
          error={errors.max_capacity}
          placeholder="Nhập 0 nếu không giới hạn"
          min="0"
        />

        <FormSelect 
            label="Trạng thái" 
            name="is_active" 
            // Convert boolean -> string để bind vào select
            value={String(form.is_active)} 
            onChange={handleStatusChange}
        >
          <option value="true">Hoạt động</option>
          <option value="false">Ngừng hoạt động</option>
        </FormSelect>
        
        {/* Mô tả hoặc ghi chú thêm (nếu có trong tương lai) */}
        <FormInput
          label="Mô tả / Ghi chú"
          name="description"
          value={form.description || ""}
          onChange={handleChange}
          error={errors.description}
          placeholder="Ghi chú thêm về vị trí này..."
        />
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo vị trí" : "Lưu thay đổi"}
      />
    </form>
  );
}