// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/InventoryForm.jsx

import { useMemo, useEffect, useState } from "react";
import { inventoryCreateSchema, inventoryUpdateSchema } from "../../validations/inventory.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";

/* ==============================
 * Helpers & Configs
 * ============================== */
const cleanData = (data) => {
  if (!data) return {};
  const cleaned = {};
  Object.keys(data).forEach((key) => {
    // Với số (quantity, id), giữ nguyên hoặc về "" nếu null
    if (typeof data[key] === "number") {
        cleaned[key] = data[key];
    } else {
        cleaned[key] = data[key] === null || data[key] === undefined ? "" : data[key];
    }
  });
  return cleaned;
};

const DEFAULT_FORM = {
  warehouse_id: "",
  bin_id: "",
  product_id: "",
  quantity_on_hand: 0,
  quantity_allocated: 0,
  notes: "",
};

/* ==============================
 * Main Component
 * ============================== */
export default function InventoryForm({ 
  mode = "create", 
  initialData, 
  onSubmit, 
  onCancel,
  // Props dữ liệu tham chiếu
  warehouseOptions = [], 
  binOptions = [], 
  productOptions = [] 
}) {
  const toast = useToast();

  // Chọn schema dựa trên mode (Create validation chặt hơn Update một chút về logic key)
  const activeSchema = mode === "create" ? inventoryCreateSchema : inventoryUpdateSchema;

  // Khởi tạo giá trị form
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    return {
      ...DEFAULT_FORM,
      ...cleanData(initialData),
    };
  }, [initialData]);

  // Hook quản lý form
  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: activeSchema,
  });

  // State để lọc Bin theo Warehouse đã chọn
  const [filteredBins, setFilteredBins] = useState([]);

  // Effect: Lọc danh sách Bin khi Warehouse thay đổi
  useEffect(() => {
    if (!form.warehouse_id) {
        setFilteredBins([]);
        return;
    }
    // Lọc bin có warehouse_id trùng với form.warehouse_id
    // Lưu ý: convert về string để so sánh an toàn
    const binsInWarehouse = binOptions.filter(
        b => String(b.warehouse_id) === String(form.warehouse_id)
    );
    setFilteredBins(binsInWarehouse);
  }, [form.warehouse_id, binOptions]);

  // Tính toán Available realtime để hiển thị
  const calculatedAvailable = useMemo(() => {
    const onHand = Number(form.quantity_on_hand) || 0;
    const allocated = Number(form.quantity_allocated) || 0;
    const available = onHand - allocated;
    return available < 0 ? 0 : available;
  }, [form.quantity_on_hand, form.quantity_allocated]);

  const isDirty = useMemo(() => {
    // So sánh đơn giản JSON
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

    // Validate logic bổ sung (nếu schema chưa bắt hết)
    if (calculatedAvailable < 0) {
        toast.error("Số lượng tồn kho không thể nhỏ hơn số lượng đã cấp phát!");
        return;
    }

    if (form.bin_id) {
        // Tìm thông tin bin đang chọn trong danh sách options
        const selectedBin = binOptions.find(
            b => String(b.id) === String(form.bin_id)
        );

        if (selectedBin) {
            const maxCapacity = Number(selectedBin.max_capacity) || 0;
            // Nếu có thiết lập sức chứa (> 0) và số lượng khả dụng vượt quá
            if (maxCapacity > 0 && calculatedAvailable > maxCapacity) {
                toast.error(`Vượt quá sức chứa! Vị trí này chỉ chứa tối đa ${maxCapacity} đơn vị.`);
                // Focus lại vào ô nhập số lượng nếu cần
                return; // Dừng submit
            }
        }
    }

    if (!validate(form)) return;

    const confirmMsg = mode === "create" 
        ? "Tạo mới dữ liệu tồn kho?" 
        : "Cập nhật số lượng tồn kho?";
    
    if (!window.confirm(confirmMsg)) return;

    onSubmit?.(form);
  };

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Nhập kho (Initial Stock)" : "Điều chỉnh tồn kho"}</h3>

      {/* Main Info */}
      <div className="form-grid">
        
        {/* Section 1: Định danh (Kho - Bin - Sản phẩm) */}
        {/* Ở chế độ Edit, các trường này bị khóa để đảm bảo toàn vẹn dữ liệu */}
        
        <FormSelect
          label="Kho hàng"
          name="warehouse_id"
          value={form.warehouse_id}
          onChange={(e) => {
             handleChange(e);
             // Reset bin khi đổi kho
             setForm(prev => ({ ...prev, bin_id: "" })); 
          }}
          required
          error={errors.warehouse_id}
          disabled={mode === "edit"} // Khóa khi edit
          style={mode === "edit" ? { backgroundColor: "#f3f4f6" } : {}}
        >
            <option value="">-- Chọn Kho hàng --</option>
            {warehouseOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
        </FormSelect>

        <FormSelect
          label="Vị trí (Bin)"
          name="bin_id"
          value={form.bin_id}
          onChange={handleChange}
          required
          error={errors.bin_id}
          disabled={mode === "edit" || !form.warehouse_id} // Khóa khi edit hoặc chưa chọn kho
          style={mode === "edit" ? { backgroundColor: "#f3f4f6" } : {}}
        >
            <option value="">-- Chọn Vị trí --</option>
            {filteredBins.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.code} (Max: {opt.max_capacity})</option>
            ))}
        </FormSelect>

        <div style={{ gridColumn: "1 / -1" }}>
            <FormSelect
            label="Sản phẩm"
            name="product_id"
            value={form.product_id}
            onChange={handleChange}
            required
            error={errors.product_id}
            disabled={mode === "edit"} // Khóa khi edit
            style={mode === "edit" ? { backgroundColor: "#f3f4f6" } : {}}
            >
                <option value="">-- Chọn Sản phẩm --</option>
                {productOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name} ({opt.sku})</option>
                ))}
            </FormSelect>
        </div>

        <hr style={{ gridColumn: "1 / -1", margin: "10px 0", border: "0", borderTop: "1px solid #eee" }} />

        {/* Section 2: Số lượng */}
        
        <FormInput
          label="Tồn kho thực tế (On Hand)"
          name="quantity_on_hand"
          type="number"
          value={form.quantity_on_hand}
          onChange={handleChange}
          required
          min="0"
          error={errors.quantity_on_hand}
          placeholder="0"
        />

        <FormInput
          label="Đã cấp phát (Allocated)"
          name="quantity_allocated"
          type="number"
          value={form.quantity_allocated}
          onChange={handleChange}
          required
          min="0"
          error={errors.quantity_allocated}
          placeholder="0"
          // Thường allocated được tính tự động bởi hệ thống Order, 
          // nhưng cho phép sửa thủ công trong trường hợp cần fix lỗi data.
        />

        {/* Read-only field for Available */}
        <div className="form-group">
            <label>Khả dụng (Available)</label>
            <input 
                type="text" 
                className="form-control"
                value={calculatedAvailable} 
                readOnly 
                disabled
                style={{ fontWeight: "bold", color: calculatedAvailable > 0 ? "#28a745" : "#dc3545", backgroundColor: "#e9ecef" }}
            />
            <small className="form-text text-muted" style={{marginLeft: 0}}>
                Tự động tính: Tồn kho - Cấp phát
            </small>
        </div>

        <div className="form-group" style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
           <label>Ghi chú bổ sung</label>
           <textarea
             className="form-control"
             name="notes"
             rows="3"
             placeholder="Nhập ghi chú về lô hàng, lý do điều chỉnh..."
             value={form.notes || ""}
             onChange={handleChange}
             style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
           />
        </div>

      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Nhập kho" : "Cập nhật tồn"}
      />
    </form>
  );
}