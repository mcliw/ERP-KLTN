import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/form.css";
import {
  positionCreateSchema,
  positionUpdateSchema,
  POSITION_NAME_OPTIONS,
} from "../../validations/position.schema";
import { FaSave, FaTimes } from "react-icons/fa";
import { departmentService } from "../../services/department.service";

/* =========================
 * Constants
 * ========================= */

const DEFAULT_FORM = {
  code: "",
  name: "",
  department: "",
  capacity: 1,
  status: "Hoạt động",
  description: "",
};

/* =========================
 * Component
 * ========================= */

export default function PositionForm({
  mode = "create",
  initialData = null,
  hasAssignees = false, // ⭐ QUAN TRỌNG
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState("");

  const initialSnapshotRef = useRef(null);

  /* =========================
   * Departments
   * ========================= */

  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] =
    useState(false);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const list = await departmentService.getAll();
        setDepartments(
          list.filter(
            (d) => !d.status || d.status === "Hoạt động"
          )
        );
      } catch {
        setDepartments([]);
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  /* =========================
   * Init edit mode
   * ========================= */

  useEffect(() => {
    if (mode !== "edit" || !initialData) return;

    const nextForm = {
      ...DEFAULT_FORM,
      ...initialData,
      capacity: Math.max(
        Number(initialData.capacity ?? 1),
        Number(initialData.assigneeCount ?? 0) || 1
      ),
    };

    setForm(nextForm);
    initialSnapshotRef.current = { ...nextForm };
  }, [mode, initialData]);

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

  const handleCapacityChange = (e) => {
    const min = hasAssignees
      ? Number(initialData?.assigneeCount ?? 1)
      : 1;

    const value = Math.max(min, Number(e.target.value || min));

    setForm((prev) => ({
      ...prev,
      capacity: value,
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
        ? positionCreateSchema
        : positionUpdateSchema;

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
        ? "Bạn có chắc chắn muốn tạo chức vụ này?"
        : "Bạn có chắc chắn muốn lưu thay đổi chức vụ này?"
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
    <form className="position-form" onSubmit={handleSubmit}>
      <h3>
        {mode === "create"
          ? "Tạo chức vụ"
          : "Cập nhật chức vụ"}
      </h3>

      <div className="form-grid">
        {/* Code */}
        <div className="form-group">
          <label>Mã chức vụ *</label>
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
          <label>Chức vụ *</label>
          <select
            name="name"
            value={form.name}
            onChange={handleChange}
            disabled={mode === "edit" && hasAssignees}
          >
            <option value="">-- Chọn chức vụ --</option>
            {POSITION_NAME_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {renderError("name")}
        </div>

        {/* Department */}
        <div className="form-group">
          <label>Phòng ban *</label>
          <select
            name="department"
            value={form.department}
            onChange={handleChange}
            disabled={
              loadingDepartments ||
              (mode === "edit" && hasAssignees)
            }
          >
            <option value="">-- Chọn phòng ban --</option>

            {loadingDepartments ? (
              <option disabled>Đang tải...</option>
            ) : (
              departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))
            )}
          </select>
          {renderError("department")}
        </div>

        {/* Capacity */}
        <div className="form-group">
          <label>Số người có thể đảm nhận *</label>
          <input
            type="number"
            name="capacity"
            min={1}
            value={form.capacity}
            onChange={handleCapacityChange}
          />
          {hasAssignees && (
            <small className="hint">
              Không được nhỏ hơn số người đang đảm
              nhận
            </small>
          )}
          {renderError("capacity")}
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
            ? "Tạo chức vụ"
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