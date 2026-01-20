// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/ProductCategoryForm.jsx

import { useMemo, useEffect, useState } from "react";
// Giả định bạn đã tạo schema validation tương tự employee.schema
import { productCategorySchema } from "../../validations/productCategory.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
// Giả định service gọi API
import { productCategoryService } from "../../services/productCategory.service";
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
  name: "",
  parentId: "", // ID của danh mục cha
  description: "",
  status: "Hoạt động",
};

/* ==============================
 * Main Component
 * ============================== */
export default function ProductCategoryForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const [categories, setCategories] = useState([]); // Danh sách dùng cho dropdown Parent
  const [loadingCats, setLoadingCats] = useState(false);
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

  // Hook quản lý form (tương tự EmployeeForm)
  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: productCategorySchema, // Schema validate tên, mô tả...
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

  // Load danh sách categories để chọn Parent ID
  useEffect(() => {
    let mounted = true;
    const loadCategories = async () => {
      setLoadingCats(true);
      try {
        const list = await productCategoryService.getAll();
        if (mounted) {
            // Chỉ lấy các category đang hoạt động để làm cha
            setCategories(list.filter((c) => c.status === "Hoạt động"));
        }
      } catch (err) {
        console.error("Failed to load categories", err);
        if (mounted) setCategories([]);
      } finally {
        if (mounted) setLoadingCats(false);
      }
    };
    loadCategories();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    if (!validate(form)) return;

    if (!window.confirm(mode === "create" ? "Xác nhận tạo danh mục mới?" : "Lưu các thay đổi?")) return;

    onSubmit?.(form);
  };

  // Render options cho Danh mục cha
  // Logic: Không thể chọn chính mình làm cha
  const renderParentOptions = () => {
    if (loadingCats) return <option>Đang tải...</option>;
    
    // Lọc bỏ chính category đang sửa (nếu ở mode edit)
    const availableParents = mode === "edit" 
        ? categories.filter(c => c.id !== initialData?.id)
        : categories;

    if (availableParents.length === 0) return <option value="">-- Không có danh mục khả dụng --</option>;

    return (
      <>
        <option value="">-- Không có (Danh mục gốc) --</option>
        {availableParents.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </>
    );
  };

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo danh mục sản phẩm" : "Cập nhật danh mục"}</h3>

      {/* Main Info */}
      <div className="form-grid">
        {/* Nếu mode edit thì hiển thị ID nhưng disable */}
        {mode === "edit" && (
           <FormInput
            label="Mã danh mục (ID)"
            name="id"
            value={form.id || ""}
            readOnly
            disabled
            style={{ backgroundColor: "#f3f4f6" }}
          />
        )}

        <FormInput
          label="Tên danh mục"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          error={errors.name}
          placeholder="Ví dụ: Laptop, Bàn ghế..."
        />

        <FormSelect
          label="Danh mục cha"
          name="parentId"
          value={form.parentId}
          onChange={handleChange}
          disabled={loadingCats}
          error={errors.parentId}
        >
          {renderParentOptions()}
        </FormSelect>

        <FormSelect 
            label="Trạng thái" 
            name="status" 
            value={form.status} 
            onChange={handleChange}
        >
          <option value="Hoạt động">Hoạt động</option>
          <option value="Ngừng hoạt động">Ngừng hoạt động</option>
        </FormSelect>
        
        {/* Description thường dài nên có thể để full width hoặc dùng input text */}
        <div style={{ gridColumn: "1 / -1" }}>
            <FormInput
            label="Mô tả"
            name="description"
            value={form.description}
            onChange={handleChange}
            error={errors.description}
            placeholder="Mô tả chi tiết về danh mục này..."
            />
        </div>
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo danh mục" : "Lưu thay đổi"}
      />
    </form>
  );
}