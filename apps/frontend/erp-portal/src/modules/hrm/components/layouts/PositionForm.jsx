// apps/frontend/erp-portal/src/modules/hrm/components/layouts/PositionForm.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/form.css";
import {
  positionCreateSchema,
  positionUpdateSchema,
} from "../../validations/position.schema";
import { FaSave, FaTimes } from "react-icons/fa";
import { departmentService } from "../../services/department.service";

const DEFAULT_FORM = {
  code: "",
  name: "",
  department: "",
  assigneeCode: "",
  assigneeName: "",
  level: "",
  capacity: 1,
  status: "Hoạt động",
};

export default function PositionForm({
  mode = "create",
  initialData = null,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState("");
  const initialSnapshotRef = useRef(null);

  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  /* ======================
     LOAD DEPARTMENTS
  ====================== */
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const all = await departmentService.getAll();

        // 🔥 an toàn với dữ liệu cũ
        const active = all.filter(
          (d) => !d.status || d.status === "Hoạt động"
        );

        setDepartments(active);
      } catch (err) {
        console.error("Không tải được danh sách phòng ban", err);
        setDepartments([]);
      } finally {
        setLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  /* ======================
     CẢNH BÁO PHÒNG BAN NGƯNG HOẠT ĐỘNG
  ====================== */
  useEffect(() => {
    if (mode === "edit" && form.department && departments.length > 0) {
      const exists = departments.some((d) => d.code === form.department);

      if (!exists) {
        setInfoMessage(
          "⚠ Phòng ban hiện tại đã ngừng hoạt động. Vui lòng chọn phòng ban khác."
        );
      }
    }
  }, [mode, form.department, departments]);

  /* ======================
     INIT FORM (EDIT)
  ====================== */
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const next = {
        ...DEFAULT_FORM,
        ...initialData,
        capacity: Number(initialData.capacity ?? 1),
      };

      setForm(next);
      initialSnapshotRef.current = { ...next };
    }
  }, [mode, initialData]);

  /* ======================
     OPTIONS
  ====================== */
  const levelOptions = useMemo(
    () => ["Intern", "Junior", "Middle", "Senior", "Lead"],
    []
  );

  /* ======================
     HANDLERS
  ====================== */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setInfoMessage("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const isDirty = useMemo(() => {
    if (mode !== "edit") return true;
    if (!initialSnapshotRef.current) return false;
    return JSON.stringify(form) !== JSON.stringify(initialSnapshotRef.current);
  }, [mode, form]);

  const renderError = (field) =>
    errors[field] && <span className="error">{errors[field]}</span>;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      setInfoMessage("Không có thay đổi nào để lưu.");
      return;
    }

    const schema =
      mode === "create" ? positionCreateSchema : positionUpdateSchema;

    const result = schema.safeParse(form);

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach(
        (err) => (fieldErrors[err.path[0]] = err.message)
      );
      setErrors(fieldErrors);

      const first = Object.keys(fieldErrors)[0];
      document.querySelector(`[name="${first}"]`)?.focus();
      return;
    }

    setErrors({});

    const msg =
      mode === "create"
        ? "Bạn có chắc chắn muốn tạo chức vụ này?"
        : "Bạn có chắc chắn muốn lưu thay đổi chức vụ này?";

    if (!window.confirm(msg)) return;

    onSubmit?.(form);
  };

  /* ======================
     RENDER
  ====================== */
  return (
    <form className="position-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo chức vụ" : "Cập nhật chức vụ"}</h3>

      <div className="form-grid">
        {/* MÃ */}
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

        {/* TÊN */}
        <div className="form-group">
          <label>Tên chức vụ *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
          />
          {renderError("name")}
        </div>

        {/* NGƯỜI ĐẢM NHẬN – CHỈ XEM */}
        {mode === "edit" && (
          <div className="form-group">
            <label>Người đảm nhận</label>
            <input
              value={form.assigneeName || "— Chưa phân công —"}
              disabled
            />
          </div>
        )}

        {/* PHÒNG BAN */}
        <div className="form-group">
          <label>Phòng ban *</label>
          <select
            name="department"
            value={form.department}
            onChange={handleChange}
            disabled={loadingDepartments}
          >
            <option value="">
              {loadingDepartments ? "Đang tải..." : "-- Chọn --"}
            </option>

            {departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
          {renderError("department")}
        </div>

        {/* CẤP BẬC */}
        <div className="form-group">
          <label>Cấp bậc</label>
          <select
            name="level"
            value={form.level}
            onChange={handleChange}
          >
            <option value="">-- Chọn --</option>
            {levelOptions.map((lv) => (
              <option key={lv} value={lv}>
                {lv}
              </option>
            ))}
          </select>
        </div>

        {/* CAPACITY */}
        <div className="form-group">
          <label>Số người có thể đảm nhận *</label>
          <input
            type="number"
            name="capacity"
            min={1}
            value={form.capacity}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                capacity: Math.max(1, Number(e.target.value || 1)),
              }))
            }
          />
          {renderError("capacity")}
        </div>

        {/* TRẠNG THÁI */}
        <div className="form-group">
          <label>Trạng thái</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
          >
            <option value="Hoạt động">Hoạt động</option>
            {mode === "edit" && (
              <option value="Ngưng hoạt động">Ngưng hoạt động</option>
            )}
          </select>
        </div>
      </div>

      {infoMessage && <div className="info-message">{infoMessage}</div>}

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
          {mode === "create" ? "Tạo chức vụ" : "Lưu thay đổi"}
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