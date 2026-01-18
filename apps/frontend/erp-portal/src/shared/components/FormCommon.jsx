import { useState, useEffect, useRef, useMemo } from "react";
import { FaSave, FaTimes, FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/form.css";

/* ================= HOOK: QUẢN LÝ LOGIC FORM ================= */
export const useFormManager = ({ initialValues, mode, schema }) => {
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const initialSnapshot = useRef(null);

  // Khởi tạo data khi edit
  useEffect(() => {
    if (mode === "edit" || mode === "create") {
      // Deep copy để so sánh isDirty chính xác
      const init = JSON.parse(JSON.stringify(initialValues));
      setForm(init);
      if (mode === "edit") {
        initialSnapshot.current = JSON.stringify(init);
      }
    }
  }, [mode, initialValues]);

  // Handle change cho input thường
  const handleChange = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setFieldValue = (name, value) => {
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Kiểm tra form có thay đổi không
  const isDirty = useMemo(() => {
    if (mode !== "edit") return true;
    if (!initialSnapshot.current) return false;
    return JSON.stringify(form) !== initialSnapshot.current;
  }, [mode, form]);

  // Hàm validate chung
  const validate = (dataToValidate = form) => {
    if (!schema) return true;
    const result = schema.safeParse(dataToValidate);
    
    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      
      const firstField = Object.keys(fieldErrors)[0];
      document.querySelector(`[name="${firstField}"]`)?.focus();
      return false;
    }
    
    setErrors({});
    return true;
  };

  return { form, setForm, setFieldValue, errors, setErrors, handleChange, isDirty, validate };
};

/* ================= UI COMPONENTS ================= */

export const FormField = ({ label, required, error, children, className = "form-group" }) => (
  <div className={className}>
    <label>
      {label} {required && "*"}
    </label>
    {children}
    {error && <span className="error">{error}</span>}
  </div>
);

// Input Text/Number/Date/Email
export const FormInput = ({ label, name, value, onChange, error, type = "text", required, disabled, placeholder, min, max, ...props }) => (
  <FormField label={label} required={required} error={error} className={props.className}>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      min={min}
      max={max}
      {...props}
    />
  </FormField>
);

// Password Input có nút ẩn/hiện
export const FormPassword = ({ label, name, value, onChange, error, placeholder, required, disabled }) => {
  const [show, setShow] = useState(false);
  return (
    <FormField label={label} required={required} error={error}>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          style={{ width: "100%" }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex"
          }}
          title={show ? "Ẩn" : "Hiện"}
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </FormField>
  );
};

// Select Box
export const FormSelect = ({ label, name, value, onChange, error, options = [], required, disabled, placeholder = "-- Chọn --", children }) => (
  <FormField label={label} required={required} error={error}>
    <select name={name} value={value} onChange={onChange} disabled={disabled}>
      <option value="">{placeholder}</option>
      {options.length > 0 ? options.map(opt => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      )) : children}
    </select>
  </FormField>
);

// Textarea
export const FormTextarea = ({ label, name, value, onChange, error, rows = 3, className = "form-group full-width" }) => (
  <FormField label={label} error={error} className={className}>
    <textarea name={name} value={value} onChange={onChange} rows={rows} />
  </FormField>
);

// Action Buttons (Lưu / Hủy)
export const FormActions = ({ mode, isDirty, onCancel, submitLabel }) => (
  <div className="form-actions">
    <button
      type="submit"
      className="btn-primary"
      title={mode === "edit" && !isDirty ? "Chưa có thay đổi để lưu" : ""}
    >
      <FaSave style={{ marginRight: 5 }} />
      {submitLabel || (mode === "create" ? "Tạo mới" : "Lưu thay đổi")}
    </button>

    <button type="button" className="btn-secondary" onClick={onCancel}>
      <FaTimes /> <span>Hủy</span>
    </button>
  </div>
);