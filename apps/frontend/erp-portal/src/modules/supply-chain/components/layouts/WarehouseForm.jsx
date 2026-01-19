// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/WarehouseForm.jsx

import { useMemo, useEffect } from "react";
import { warehouseSchema } from "../../validations/warehouse.schema";
import { warehouseService, WAREHOUSE_TYPES } from "../../services/warehouse.service"; // Import constants
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";

/* ==============================
 * Helpers & Configs
 * ============================== */
const cleanData = (data) => {
  if (!data) return {};
  const cleaned = {};
  // Duyệt qua các key để đảm bảo không bị null/undefined
  Object.keys(data).forEach((key) => {
    // Lưu ý: Với boolean (is_active), ta không convert về chuỗi rỗng
    if (typeof data[key] === "boolean") {
        cleaned[key] = data[key];
    } else {
        cleaned[key] = data[key] === null || data[key] === undefined ? "" : data[key];
    }
  });
  return cleaned;
};

const DEFAULT_FORM = {
  code: "",
  name: "",
  type: WAREHOUSE_TYPES.CENTRAL, // Mặc định là kho trung tâm
  address: "",
  is_active: true, // Mặc định là true (Boolean)
};

// Map options cho loại kho
const WAREHOUSE_TYPE_OPTIONS = [
  { value: "CENTRAL", label: "Kho Trung Tâm" },
  { value: "LOCAL", label: "Kho Địa Phương" },
  { value: "TRANSIT", label: "Kho Trung Chuyển" },
  { value: "BONDED", label: "Kho Ngoại Quan" },
  { value: "RETAIL", label: "Cửa Hàng Bán Lẻ" },
];

/* ==============================
 * Main Component
 * ============================== */
export default function WarehouseForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const toast = useToast();

  // Khởi tạo giá trị form
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return {
      ...DEFAULT_FORM,
      ...cleaned,
      // Đảm bảo type hợp lệ, nếu không fallback về CENTRAL
      type: cleaned.type || WAREHOUSE_TYPES.CENTRAL, 
    };
  }, [initialData]);

  // Hook quản lý form
  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: warehouseSchema,
  });

  const isDirty = useMemo(() => {
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

  // Xử lý riêng cho Boolean Select (Status)
  const handleStatusChange = (e) => {
    const value = e.target.value === "true"; // Convert string "true"/"false" -> boolean
    setForm(prev => ({ ...prev, is_active: value }));
  };

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
        ? "Xác nhận tạo kho hàng mới?" 
        : "Lưu các thay đổi thông tin kho?";
    if (!window.confirm(confirmMsg)) return;

    onSubmit?.(form);
  };

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo kho hàng mới" : "Cập nhật thông tin kho"}</h3>

      {/* Main Info */}
      <div className="form-grid">
        {/* Row 1: Code & Name */}
        <FormInput
          label="Mã kho"
          name="code"
          value={form.code}
          onChange={handleChange}
          required
          error={errors.code}
          placeholder="VD: WH-HN-01"
          // Thường mã kho không cho sửa khi edit, hoặc tùy nghiệp vụ
          readOnly={mode === "edit"} 
          disabled={mode === "edit"}
          style={mode === "edit" ? { backgroundColor: "#f3f4f6" } : {}}
        />

        <FormInput
          label="Tên kho"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          error={errors.name}
          placeholder="VD: Kho Trung Tâm Hà Nội"
        />

        {/* Row 2: Type & Status */}
        <FormSelect
          label="Loại kho"
          name="type"
          value={form.type}
          onChange={handleChange}
          required
          error={errors.type}
        >
          {WAREHOUSE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FormSelect>

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
        
        {/* Row 3: Address (Full Width) */}
        <div style={{ gridColumn: "1 / -1" }}>
            <FormInput
            label="Địa chỉ"
            name="address"
            value={form.address}
            onChange={handleChange}
            error={errors.address}
            placeholder="Địa chỉ chi tiết của kho hàng..."
            />
        </div>
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo kho" : "Lưu thay đổi"}
      />
    </form>
  );
}