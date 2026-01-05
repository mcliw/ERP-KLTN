// apps/frontend/erp-portal/src/modules/hrm/components/layouts/DepartmentForm.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/form.css";
import {
  departmentCreateSchema,
  departmentUpdateSchema,
} from "../../validations/department.schema";
import { FaSave, FaTimes } from "react-icons/fa";

const DEFAULT_FORM = {
  code: "",
  name: "",
  manager: "",
  status: "Hoạt động",
};

export default function DepartmentForm({
  mode = "create",
  initialData = null,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});

  const initialSnapshotRef = useRef(null);
  const [infoMessage, setInfoMessage] = useState("");

  // load data khi edit
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const nextForm = {
        ...DEFAULT_FORM,
        ...initialData,
      };

      setForm(nextForm);

      // snapshot để check dirty
      initialSnapshotRef.current = { ...nextForm };
    }
  }, [mode, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInfoMessage("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      setInfoMessage("Không có thay đổi nào để lưu.");
      return;
    }

    const schema =
      mode === "create"
        ? departmentCreateSchema
        : departmentUpdateSchema;

    const result = schema.safeParse(form);

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });

      setErrors(fieldErrors);

      // focus field lỗi đầu tiên
      const firstErrorField = Object.keys(fieldErrors)[0];
      document
        .querySelector(`[name="${firstErrorField}"]`)
        ?.focus();

      return;
    }

    setErrors({});

    const confirmMessage =
      mode === "create"
        ? "Bạn có chắc chắn muốn tạo phòng ban này?"
        : "Bạn có chắc chắn muốn lưu thay đổi phòng ban này?";

    if (!window.confirm(confirmMessage)) return;

    onSubmit?.(form);
  };

  const renderError = (field) =>
    errors[field] && <span className="error">{errors[field]}</span>;

  const isDirty = useMemo(() => {
    if (mode !== "edit") return true;
    if (!initialSnapshotRef.current) return false;

    return (
      JSON.stringify(form) !==
      JSON.stringify(initialSnapshotRef.current)
    );
  }, [mode, form]);

  return (
    <form className="department-form" onSubmit={handleSubmit}>
      <h3>
        {mode === "create"
          ? "Tạo phòng ban"
          : "Cập nhật phòng ban"}
      </h3>

      <div className="form-grid">
        {/* Mã phòng ban */}
        <div className="form-group">
          <label>Mã phòng ban *</label>
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            disabled={mode === "edit"}
          />
          {renderError("code")}
        </div>

        {/* Tên phòng ban */}
        <div className="form-group">
          <label>Tên phòng ban *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
          />
          {renderError("name")}
        </div>

        {/* Trưởng phòng */}
        <div className="form-group">
          <label>Trưởng phòng</label>
          <input
            name="manager"
            value={form.manager}
            onChange={handleChange}
          />
        </div>

        {/* Trạng thái */}
        <div className="form-group">
          <label>Trạng thái</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="Hoạt động">Hoạt động</option>
            {mode === "edit" && (
              <option value="Ngưng hoạt động">
                Ngưng hoạt động
              </option>
            )}
          </select>
        </div>
      </div>

      {infoMessage && (
        <div className="info-message">{infoMessage}</div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="btn-primary"
          title={
            mode === "edit" && !isDirty
              ? "Chưa có thay đổi để lưu"
              : ""
          }
        >
          <FaSave style={{ marginRight: 5 }} />
          {mode === "create" ? "Tạo phòng ban" : "Lưu thay đổi"}
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
        >
          <FaTimes />
          <span>Hủy</span>
        </button>
      </div>
    </form>
  );
}