// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/SupplierForm.jsx

import { useMemo, useEffect } from "react";
import { supplierCreateSchema, supplierUpdateSchema } from "../../validations/supplier.schema";
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
  name: "",
  taxCode: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  financePartnerId: "",
  rating: "",
  note: "",
  status: "Đang hợp tác",
  contractFile: null,
  contractUrl: "",
};

const FILE_FIELDS = [
  { label: "Hợp đồng hợp tác (PDF)", fileKey: "contractFile", urlKey: "contractUrl" },
];

/* ==============================
 * Main Component
 * ============================== */
export default function SupplierForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const toast = useToast();

  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return {
      ...DEFAULT_FORM,
      ...cleaned,
    };
  }, [initialData]);

  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: mode === "create" ? supplierCreateSchema : supplierUpdateSchema,
  });

  const isDirty = useMemo(() => {
    // So sánh JSON để check thay đổi
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({
        ...prev,
        ...cleanData(initialData),
      }));
    }
  }, [initialData, setForm]);

  const handleFileChange = (fieldFile, fieldUrl, type = "file") => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "pdf" && file.type !== "application/pdf") {
      alert("Chỉ cho phép file PDF");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((p) => ({
        ...p,
        [fieldFile]: file,
        [fieldUrl]: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const normalizeSubmitData = (payload) => {
    const { contractFile, ...rest } = payload;
    
    // Convert numeric fields from string to number if needed
    // (Tuỳ thuộc vào cách backend nhận, ở đây convert cho an toàn theo schema z.number())
    const financeId = rest.financePartnerId ? Number(rest.financePartnerId) : null;
    const ratingVal = rest.rating ? Number(rest.rating) : null;

    const out = {
        ...rest,
        financePartnerId: financeId,
        rating: ratingVal
    };

    return out;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    const payload = normalizeSubmitData(form);
    
    // Nếu mode edit, loại bỏ code khỏi payload (tránh gửi lên nếu backend không cần hoặc để validate schema)
    const submitData = mode === "edit" ? (({ code, ...rest }) => rest)(payload) : payload;

    if (!validate(submitData)) return;

    if (!window.confirm(mode === "create" ? "Xác nhận tạo nhà cung cấp?" : "Lưu các thay đổi?")) return;

    onSubmit?.(submitData);
  };

  const isActive = form.status === "Đang hợp tác";

  return (
    <form className="supplier-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Thêm mới Nhà cung cấp" : "Cập nhật Nhà cung cấp"}</h3>

      {/* Main Info */}
      <div className="form-grid">
        <FormInput
          label="Mã nhà cung cấp"
          name="code"
          value={form.code}
          onChange={handleChange}
          required
          disabled={mode === "edit"}
          error={errors.code}
          placeholder="VD: SUP-FPT-001"
        />

        <FormInput
          label="Tên nhà cung cấp"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          error={errors.name}
        />

        <FormInput
          label="Mã số thuế"
          name="taxCode"
          value={form.taxCode}
          onChange={handleChange}
          required
          error={errors.taxCode}
          placeholder="10 hoặc 13 số"
        />

        <FormInput
          type="email"
          label="Email liên hệ"
          name="contactEmail"
          value={form.contactEmail}
          onChange={handleChange}
          error={errors.contactEmail}
        />

        <FormInput
          label="Số điện thoại"
          name="contactPhone"
          value={form.contactPhone}
          onChange={handleChange}
          error={errors.contactPhone}
          placeholder="VD: 02473008888"
        />

        <FormInput
          label="ID Đối tác tài chính"
          name="financePartnerId"
          type="number"
          value={form.financePartnerId}
          onChange={handleChange}
          error={errors.financePartnerId}
          placeholder="Nhập ID hệ thống Finance"
        />

        <div className="form-full-width">
            <FormInput
            label="Địa chỉ chi tiết"
            name="address"
            value={form.address}
            onChange={handleChange}
            required
            error={errors.address}
            />
        </div>

        <FormInput
          label="Đánh giá (0-5)"
          name="rating"
          type="number"
          step="0.1"
          min="0"
          max="5"
          value={form.rating}
          onChange={handleChange}
          error={errors.rating}
        />

        <FormSelect label="Trạng thái" name="status" value={form.status} onChange={handleChange}>
          <option value="Đang hợp tác">Đang hợp tác</option>
          {mode === "edit" && <option value="Dừng hợp tác">Dừng hợp tác</option>}
        </FormSelect>
        
        <div className="form-full-width">
            <FormInput
                label="Ghi chú"
                name="note"
                value={form.note}
                onChange={handleChange}
                error={errors.note}
                placeholder="Ghi chú nội bộ..."
            />
        </div>
      </div>

      {/* File Upload Section */}
      <div className="form-grid" style={{ marginTop: 20 }}>
        {FILE_FIELDS.map((item) => {
          // Logic: Nếu đang hợp tác thì bắt buộc có file Hợp đồng
          const required = item.urlKey === "contractUrl" && isActive;

          return (
            <div key={item.fileKey} className="form-group file-input-group">
              <label>
                {item.label} {required && <span style={{ color: "#dc2626" }}>*</span>}
              </label>

              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange(item.fileKey, item.urlKey, "pdf")}
              />

              {form[item.urlKey] && (
                <div className="file-status">
                  <span className="success-icon" style={{ color: "green" }}>
                    ✔ Đã chọn file
                  </span>

                  {!String(form[item.urlKey]).startsWith("data:") && (
                    <a
                      href={form[item.urlKey]}
                      target="_blank"
                      rel="noreferrer"
                      className="view-file-link"
                    >
                      Xem file hiện tại
                    </a>
                  )}
                </div>
              )}

              {errors[item.urlKey] && (
                <span className="error-text" style={{ color: "red", marginTop: 5, display: "block" }}>
                  {errors[item.urlKey]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo nhà cung cấp" : "Lưu thay đổi"}
      />
    </form>
  );
}