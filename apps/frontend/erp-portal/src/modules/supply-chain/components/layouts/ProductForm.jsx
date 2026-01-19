import { useMemo, useEffect, useState } from "react";
import { productSchema } from "../../validations/product.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { productCategoryService } from "../../services/productCategory.service";
import { productService } from "../../services/product.service";
import { useToast } from "../../../../shared/components/ToastProvider";

const DEFAULT_FORM = {
  code: "", name: "", categoryId: "", type: "Hàng hóa kinh doanh", brand: "",
  unit: "Cái", minStock: 0, warranty: 0, description: "", image: "", status: "Hoạt động"
};

export default function ProductForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const [categories, setCategories] = useState([]);
  const toast = useToast();
  
  const safeInitialValues = useMemo(() => ({ ...DEFAULT_FORM, ...(initialData || {}) }), [initialData]);

  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues, mode, schema: productSchema
  });

  // Load danh mục để chọn
  useEffect(() => {
    let mounted = true;
    productCategoryService.getAll().then(res => {
        if(mounted) setCategories(res.filter(c => c.status === "Hoạt động"))
    });
    return () => { mounted = false };
  }, []);

  // Xử lý upload ảnh (Giả lập Base64 để lưu vào json-server)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, image: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // Nút tạo mã tự động
  const handleGenCode = async () => {
    if (!form.categoryId || !form.brand) {
      alert("Vui lòng chọn Danh mục và nhập Thương hiệu trước khi sinh mã.");
      return;
    }
    const code = await productService.generateSku(form.categoryId, form.brand);
    setForm(prev => ({ ...prev, code }));
  };

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }
    if (validate(form)) onSubmit?.(form);
  };

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Thêm sản phẩm mới" : "Cập nhật sản phẩm"}</h3>
      
      <div className="avatar-row">
         <div className="avatar-preview" style={{width: 120, height: 120, borderRadius: 8}}>
            {form.image ? <img src={form.image} alt="Product" /> : "Chưa có ảnh"}
         </div>
         <div className="avatar-actions">
            <label className="btn-upload">Upload Ảnh <input type="file" accept="image/*" hidden onChange={handleImageChange} /></label>
         </div>
      </div>

      <div className="form-grid">
         <FormSelect label="Phân loại" name="type" value={form.type} onChange={handleChange} required error={errors.type}>
            <option value="Hàng hóa kinh doanh">Hàng hóa kinh doanh</option>
            <option value="Tài sản công ty">Tài sản công ty</option>
         </FormSelect>

         <FormSelect label="Danh mục" name="categoryId" value={form.categoryId} onChange={handleChange} required error={errors.categoryId}>
            <option value="">-- Chọn danh mục --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
         </FormSelect>

         <div className="form-group">
             <label>Mã SKU (Để trống tự sinh)</label>
             <div style={{display: 'flex', gap: 8}}>
                 <input className="form-control" name="code" value={form.code} onChange={handleChange} placeholder="VD: LAP-DELL-001" disabled={mode==="edit"} />
                 {mode === "create" && <button type="button" className="btn-secondary" onClick={handleGenCode} title="Sinh mã tự động">Auto</button>}
             </div>
         </div>

         <FormInput label="Tên sản phẩm" name="name" value={form.name} onChange={handleChange} required error={errors.name} />
         <FormInput label="Thương hiệu" name="brand" value={form.brand} onChange={handleChange} required error={errors.brand} />
         <FormInput label="Đơn vị tính" name="unit" value={form.unit} onChange={handleChange} required error={errors.unit} />
         
         <FormInput type="number" label="Tồn kho tối thiểu" name="minStock" value={form.minStock} onChange={handleChange} />
         <FormInput type="number" label="Bảo hành (tháng)" name="warranty" value={form.warranty} onChange={handleChange} />

         <FormSelect label="Trạng thái" name="status" value={form.status} onChange={handleChange}>
            <option value="Hoạt động">Hoạt động</option>
            <option value="Ngừng hoạt động">Ngừng hoạt động</option>
         </FormSelect>

         <div style={{gridColumn: "1 / -1"}}>
            <FormInput label="Mô tả chi tiết" name="description" value={form.description} onChange={handleChange} />
         </div>
      </div>

      <FormActions mode={mode} onCancel={onCancel} submitLabel={mode==="create"?"Lưu sản phẩm":"Cập nhật"} />
    </form>
  );
}