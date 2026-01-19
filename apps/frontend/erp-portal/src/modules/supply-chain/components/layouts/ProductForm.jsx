// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/ProductForm.jsx

import { useMemo, useEffect, useState, useCallback } from "react";
import {
  productCreateSchema,
  productUpdateSchema,
} from "../../validations/product.schema";
import {
  useFormManager,
  FormInput,
  FormSelect,
  FormActions,
} from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";

/* ==============================
 * Helpers
 * ============================== */
// 1. Tạo mã từ tên (Samsung -> SAM)
const generateCodeFromName = (name) => {
  if (!name) return "XXX";
  const str = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return str.replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase();
};

const cleanData = (data) => {
  if (!data) return {};
  const cleaned = {};
  Object.keys(data).forEach((key) => {
    cleaned[key] = data[key] === null || data[key] === undefined ? "" : data[key];
  });
  return cleaned;
};

// 2. Định nghĩa các loại sản phẩm và Mã tiền tố tương ứng
const PRODUCT_TYPES = [
  { value: 'trading_goods', label: 'Hàng hóa kinh doanh', prefix: 'HH' },
  { value: 'company_asset', label: 'Tài sản công ty', prefix: 'TS' }
];

const DEFAULT_FORM = {
  sku: "",
  product_name: "",
  category_id: "", // Vẫn giữ để phân nhóm, nhưng không đưa vào SKU nếu không cần
  product_type: "trading_goods", // Default
  brand: "",
  unit_of_measure: "",
  min_stock_level: 0,
  warranty_months: 0,
  image_url: "",
};

/* ==============================
 * Main Component
 * ============================== */
export default function ProductForm({
  mode = "create",
  initialData,
  categoryOptions = [], 
  onSubmit,
  onCancel,
}) {
  const toast = useToast();
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);

  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return { 
      ...DEFAULT_FORM, 
      ...cleaned,
      category_id: cleaned.category_id ? String(cleaned.category_id) : ""
    };
  }, [initialData]);

  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: mode === "create" ? productCreateSchema : productUpdateSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  // Cập nhật form khi initialData thay đổi
  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({ 
        ...prev, 
        ...cleanData(initialData),
        category_id: initialData.category_id ? String(initialData.category_id) : ""
      }));
    }
  }, [initialData, setForm]);

  /* ==============================
   * Logic: Auto Generate SKU
   * Rule: [LOẠI]-[THƯƠNG HIỆU]-[SEQ]
   * ============================== */
  
  // Mock API lấy số thứ tự (Backend sẽ xử lý việc này chuẩn xác hơn)
  const fetchNextSequence = async (type, brand) => {
    // Thực tế: await api.get(`/products/next-seq?type=${type}&brand=${brand}`)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Math.floor(Math.random() * 8999) + 1000); // Random 4 số: 1000-9999
      }, 400);
    });
  };

  const handleGenerateSku = useCallback(async () => {
    if (mode !== "create") return;
    
    // Yêu cầu: Phải có Loại và Thương hiệu mới sinh được mã
    if (!form.product_type || !form.brand) return;

    setIsGeneratingSku(true);

    try {
      // 1. Lấy Tiền tố Loại (HH hoặc TS)
      const selectedType = PRODUCT_TYPES.find(t => t.value === form.product_type);
      const typePrefix = selectedType?.prefix || "SP";

      // 2. Lấy Mã Thương hiệu (Samsung -> SAM)
      const brandCode = generateCodeFromName(form.brand);

      // 3. Lấy Số thứ tự
      const sequence = await fetchNextSequence(form.product_type, form.brand);

      // 4. Ghép chuỗi: HH-SAM-1023
      const autoSku = `${typePrefix}-${brandCode}-${sequence}`;

      setForm((prev) => ({ ...prev, sku: autoSku }));
    } catch (error) {
      console.error("Lỗi sinh SKU", error);
    } finally {
      setIsGeneratingSku(false);
    }
  }, [mode, form.product_type, form.brand, setForm]);

  // Tự động trigger khi đổi Loại hoặc Thương hiệu (có debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === "create" && form.product_type && form.brand) {
        handleGenerateSku();
      }
    }, 600); 

    return () => clearTimeout(timer);
  }, [form.product_type, form.brand, mode, handleGenerateSku]);


  /* ==============================
   * Handlers
   * ============================== */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "edit" && !isDirty) {
      toast.info("Không có thay đổi nào.");
      return;
    }

    const submitData = {
      ...form,
      category_id: form.category_id ? parseInt(form.category_id, 10) : null,
      min_stock_level: parseInt(form.min_stock_level || 0, 10),
      warranty_months: parseInt(form.warranty_months || 0, 10),
    };

    if (!validate(submitData)) return;
    if (!window.confirm(mode === "create" ? "Tạo mới?" : "Lưu thay đổi?")) return;
    onSubmit?.(submitData);
  };

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">
          {mode === "create" ? "Thêm mới sản phẩm/Tài sản" : "Cập nhật thông tin"}
        </h3>
      </div>

      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* === Cột Trái: Định danh & Phân loại === */}
        <div className="left-col flex flex-col gap-4">
          
          {/* 1. Chọn Loại (Quan trọng nhất) */}
          <FormSelect
            label="Phân loại"
            name="product_type"
            value={form.product_type}
            onChange={handleChange}
            required
            disabled={mode === 'edit'} // Không nên đổi loại khi đã tạo
            error={errors.product_type}
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </FormSelect>

          {/* 2. Thương hiệu */}
          <FormInput
            label="Thương hiệu"
            name="brand"
            value={form.brand}
            onChange={handleChange}
            required
            placeholder="VD: Samsung, Hoa Phat, ..."
            error={errors.brand}
            helperText="Nhập thương hiệu để sinh mã SKU"
          />

          {/* 3. SKU (Tự động) */}
          <div className="relative">
            <FormInput
              label="Mã SKU (Tự động)"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              disabled
              required
              className="bg-gray-100 font-mono font-bold text-primary"
              error={errors.sku}
              placeholder="VD: HH-SAM-XXXX"
            />
             {isGeneratingSku && (
               <span className="absolute right-2 top-9 text-xs text-blue-600 animate-pulse">
                 Đang tạo mã...
               </span>
             )}
          </div>

          <FormInput
            label="Tên sản phẩm"
            name="product_name"
            value={form.product_name}
            onChange={handleChange}
            required
            error={errors.product_name}
          />

           <FormSelect
            label="Danh mục chi tiết"
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            required
            error={errors.category_id}
          >
            <option value="">-- Chọn danh mục --</option>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FormSelect>
        </div>

        {/* === Cột Phải: Thông tin kho & Ảnh === */}
        <div className="right-col flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Đơn vị tính"
              name="unit_of_measure"
              value={form.unit_of_measure}
              onChange={handleChange}
              placeholder="Cái, Bộ..."
              error={errors.unit_of_measure}
            />
            <FormInput
              label="Bảo hành (tháng)"
              name="warranty_months"
              type="number"
              value={form.warranty_months}
              onChange={handleChange}
            />
          </div>

          <FormInput
            label="Tồn kho tối thiểu"
            name="min_stock_level"
            type="number"
            value={form.min_stock_level}
            onChange={handleChange}
            helperText="Hệ thống sẽ cảnh báo khi tồn kho dưới mức này"
          />

          <FormInput
            label="Link Hình ảnh"
            name="image_url"
            value={form.image_url}
            onChange={handleChange}
            placeholder="https://..."
          />

          {/* Preview Ảnh */}
          <div className="image-preview border rounded-lg p-2 h-32 flex items-center justify-center bg-gray-50">
            {form.image_url ? (
              <img 
                src={form.image_url} 
                alt="Preview" 
                className="h-full object-contain"
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = "https://via.placeholder.com/150?text=No+Image";
                }}
              />
            ) : (
              <span className="text-gray-400 text-sm">Chưa có ảnh</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t">
        <FormActions
          mode={mode}
          isDirty={isDirty}
          onCancel={onCancel}
          submitLabel={mode === "create" ? "Hoàn tất" : "Lưu thay đổi"}
        />
      </div>
    </form>
  );
}