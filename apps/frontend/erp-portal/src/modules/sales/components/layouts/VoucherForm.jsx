// apps/frontend/erp-portal/src/modules/sales/components/layouts/VoucherForm.jsx

import { useMemo, useEffect } from "react";
import { voucherSchema } from "../../validations/voucher.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";

/* ==============================
 * Helpers & Configs
 * ============================== */

// Hàm làm sạch và làm phẳng dữ liệu từ cấu trúc lồng nhau (Nested -> Flat)
const cleanData = (data) => {
  if (!data) return {};

  // Lấy dữ liệu từ các bảng con (nếu có)
  const detail = data.voucher_details?.[0] || {};
  const constraint = data.voucher_constraints?.[0] || {};

  return {
    // Dữ liệu bảng Voucher (Master)
    id: data.id,
    discount_type: data.discount_type || "FIXED_AMOUNT",
    discount_value: data.discount_value !== null && data.discount_value !== undefined ? data.discount_value : "",
    status: data.status || "ACTIVE", // Map từ service đã xử lý is_active -> status

    // Dữ liệu bảng Detail (Code)
    // Ưu tiên lấy từ detail, nếu không có thì check data gốc (trường hợp data đã được flat trước đó)
    code: detail.code || data.code || "",

    // Dữ liệu bảng Constraint (Conditions)
    min_order_amount: constraint.min_order_amount !== null ? constraint.min_order_amount : "",
    max_discount_amount: constraint.max_discount_amount !== null ? constraint.max_discount_amount : "",
  };
};

const DEFAULT_FORM = {
  code: "",
  discount_type: "FIXED_AMOUNT",
  discount_value: "",
  min_order_amount: "",
  max_discount_amount: "",
  status: "ACTIVE",
};

/* ==============================
 * Main Component
 * ============================== */
export default function VoucherForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const toast = useToast();

  // Khởi tạo giá trị form
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    // Map dữ liệu nested sang flat
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
    schema: voucherSchema,
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

  // Logic UI: Kiểm tra loại giảm giá để disable trường "Giảm tối đa"
  const isFixedAmount = form.discount_type === "FIXED_AMOUNT";

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    if (!validate(form)) return;

    if (!window.confirm(mode === "create" ? "Tạo mới mã giảm giá?" : "Lưu các thay đổi?")) return;

    // Lưu ý: Form trả về object phẳng. 
    // Service hoặc Parent Component sẽ chịu trách nhiệm mapping lại thành cấu trúc nested để gửi API.
    onSubmit?.(form);
  };

  return (
    <form className="voucher-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Thêm mới Voucher" : "Cập nhật Voucher"}</h3>

      {/* Main Grid */}
      <div className="form-grid">
        
        {/* --- Phần 1: Thông tin cơ bản --- */}
        
        {/* Mã Voucher: ReadOnly khi Edit */}
        <FormInput
          label="Mã Voucher (Code)"
          name="code"
          value={form.code}
          onChange={(e) => {
            // Tự động viết hoa khi nhập
            e.target.value = e.target.value.toUpperCase();
            handleChange(e);
          }}
          required
          error={errors.code}
          placeholder="VD: SUMMER2024"
          readOnly={mode === "edit"}
          disabled={mode === "edit"}
          style={mode === "edit" ? { backgroundColor: "#f3f4f6" } : {}}
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

        {/* --- Phần 2: Giá trị giảm giá --- */}
        <div style={{ gridColumn: "1 / -1", margin: "10px 0 5px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
            <strong>Cấu hình giảm giá</strong>
        </div>

        <FormSelect
          label="Loại giảm giá"
          name="discount_type"
          value={form.discount_type}
          onChange={handleChange}
        >
          <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
          <option value="PERCENTAGE">Theo phần trăm (%)</option>
        </FormSelect>

        <FormInput
          label={`Giá trị giảm (${isFixedAmount ? 'VNĐ' : '%'})`}
          name="discount_value"
          type="number"
          value={form.discount_value}
          onChange={handleChange}
          required
          error={errors.discount_value}
          placeholder={isFixedAmount ? "VD: 50000" : "VD: 10"}
          min="0"
        />

        {/* --- Phần 3: Điều kiện áp dụng --- */}
        <div style={{ gridColumn: "1 / -1", margin: "10px 0 5px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
            <strong>Điều kiện áp dụng</strong>
        </div>

        <FormInput
          label="Đơn hàng tối thiểu (VNĐ)"
          name="min_order_amount"
          type="number"
          value={form.min_order_amount}
          onChange={handleChange}
          error={errors.min_order_amount}
          placeholder="VD: 200000 (Để trống nếu không giới hạn)"
          min="0"
        />

        <FormInput
          label="Mức giảm tối đa (VNĐ)"
          name="max_discount_amount"
          type="number"
          value={form.max_discount_amount}
          onChange={handleChange}
          error={errors.max_discount_amount}
          placeholder={isFixedAmount ? "Không áp dụng cho số tiền cố định" : "VD: 50000"}
          min="0"
          // Disable nếu đang chọn giảm tiền cố định
          disabled={isFixedAmount}
          style={isFixedAmount ? { backgroundColor: "#f3f4f6", cursor: "not-allowed" } : {}}
        />

      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo Voucher" : "Lưu thay đổi"}
      />
    </form>
  );
}