import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/form.css";
import {
  departmentCreateSchema,
  departmentUpdateSchema,
} from "../../validations/department.schema";
import { FaSave, FaTimes } from "react-icons/fa";

/* =========================
 * Constants
 * ========================= */

const DEFAULT_FORM = {
  code: "",
  name: "",
  description: "",
  status: "Hoạt động",
};

/* =========================
 * Component
 * ========================= */

export default function DepartmentForm({
  mode = "create",
  initialData = null,
  employeeCount = 0, // ⭐ QUAN TRỌNG
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState("");

  const initialSnapshotRef = useRef(null);

  /* =========================
   * Edit mode init
   * ========================= */

  useEffect(() => {
    if (mode !== "edit" || !initialData) return;

    const nextForm = {
      ...DEFAULT_FORM,
      ...initialData,
    };

    setForm(nextForm);
    initialSnapshotRef.current = { ...nextForm };
  }, [mode, initialData]);

  /* =========================
   * Auto guard status
   * ========================= */

  useEffect(() => {
    if (
      mode === "edit" &&
      form.status === "Ngưng hoạt động" &&
      employeeCount > 0
    ) {
      setInfoMessage(
        "Không thể ngưng hoạt động phòng ban khi vẫn còn nhân viên đang làm việc."
      );

      setForm((prev) => ({
        ...prev,
        status: "Hoạt động",
      }));
    }
  }, [form.status, employeeCount, mode]);

  /* =========================
   * Handlers
   * ========================= */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInfoMessage("");

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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

    const submitData =
      mode === "edit"
        ? (() => {
            const { code, ...rest } = form;
            return rest;
          })()
        : form;

    const result = schema.safeParse(submitData);

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((i) => {
        fieldErrors[i.path[0]] = i.message;
      });

      setErrors(fieldErrors);

      document
        .querySelector(
          `[name="${Object.keys(fieldErrors)[0]}"]`
        )
        ?.focus();

      return;
    }

    setErrors({});
    setInfoMessage("");

    const ok = window.confirm(
      mode === "create"
        ? "Bạn có chắc chắn muốn tạo phòng ban này?"
        : "Bạn có chắc chắn muốn lưu thay đổi phòng ban này?"
    );
    if (!ok) return;

    onSubmit?.(submitData);
  };

  /* =========================
   * Derived
   * ========================= */

  const isDirty = useMemo(() => {
    if (mode !== "edit") return true;
    if (!initialSnapshotRef.current) return false;

    return (
      JSON.stringify(form) !==
      JSON.stringify(initialSnapshotRef.current)
    );
  }, [mode, form]);

  const renderError = (field) =>
    errors[field] && (
      <span className="error">{errors[field]}</span>
    );

  /* =========================
   * Render
   * ========================= */

  return (
    <form
      className="department-form"
      onSubmit={handleSubmit}
    >
      <h3>
        {mode === "create"
          ? "Tạo phòng ban"
          : "Cập nhật phòng ban"}
      </h3>

      <div className="form-grid">
        {/* Code */}
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

        {/* Name */}
        <div className="form-group">
          <label>Tên phòng ban *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            disabled={
              mode === "edit" &&
              form.status === "Ngưng hoạt động"
            }
          />
          {renderError("name")}
        </div>

        {/* Status */}
        <div className="form-group">
          <label>Trạng thái</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="Hoạt động">
              Hoạt động
            </option>

            {mode === "edit" && (
              <option value="Ngưng hoạt động">
                Ngưng hoạt động
              </option>
            )}
          </select>
        </div>

        {/* Description */}
        <div className="form-group full-width">
          <label>Mô tả</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
          />
          {renderError("description")}
        </div>
      </div>

      {infoMessage && (
        <div className="info-message">
          {infoMessage}
        </div>
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
          <FaSave />{" "}
          <span>{mode === "create"
            ? "Tạo phòng ban"
            : "Lưu thay đổi"}</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
        >
          <FaTimes /> <span>Hủy</span>
        </button>
      </div>
    </form>
  );
}