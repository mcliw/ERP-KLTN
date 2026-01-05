// apps/frontend/erp-portal/src/modules/hrm/components/layouts/OnLeaveForm.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/form.css";
import { FaSave, FaTimes } from "react-icons/fa";
import { departmentService } from "../../services/department.service";
import { positionService } from "../../services/position.service";
import { employeeService } from "../../services/employee.service";

import {
  onLeaveCreateSchema,
  onLeaveUpdateSchema,
} from "../../validations/onLeave.schema";

const DEFAULT_FORM = {
  employeeCode: "",
  employeeName: "",
  department: "",
  position: "",
  leaveType: "",
  fromDate: "",
  toDate: "",
  reason: "",
  status: "Chờ duyệt",
};

export default function OnLeaveForm({
  mode = "create",
  initialData = null,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState("");

  const initialSnapshotRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    employeeService.getAll().then((list) => {
        const activeEmployees = list.filter(
        (e) => e.status === "Đang làm việc"
        );
        setEmployees(activeEmployees);
    });
  }, []);

  /* -------------------- LOAD DEPARTMENTS -------------------- */
  useEffect(() => {
    departmentService
      .getAll()
      .then((list) =>
        setDepartments(
          list.filter((d) => !d.status || d.status === "Hoạt động")
        )
      )
      .catch(() => setDepartments([]));
  }, []);

  /* -------------------- LOAD POSITIONS BY DEPARTMENT -------------------- */
  useEffect(() => {
    if (!form.department) {
      setPositions([]);
      return;
    }

    positionService
      .getAll()
      .then((list) =>
        setPositions(
          list.filter(
            (p) =>
              p.status === "Hoạt động" &&
              p.department === form.department
          )
        )
      )
      .catch(() => setPositions([]));
  }, [form.department]);

  /* -------------------- LOAD INITIAL DATA (EDIT) -------------------- */
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const nextForm = { ...DEFAULT_FORM, ...initialData };
      setForm(nextForm);
      initialSnapshotRef.current = nextForm;
    }
  }, [mode, initialData]);

  const handleEmployeeChange = (e) => {
  const code = e.target.value;

  if (!code) {
    setForm((prev) => ({
      ...prev,
      employeeCode: "",
      employeeName: "",
      department: "",
      position: "",
    }));
    return;
  }

  const emp = employees.find((e) => e.code === code);
  if (!emp) return;

  setForm((prev) => ({
    ...prev,
    employeeCode: emp.code,
    employeeName: emp.name,
    department: emp.department,
    position: emp.position,
  }));
};

  /* -------------------- CHANGE HANDLER -------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setInfoMessage("");

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "department" ? { position: "" } : null),
    }));
  };

  /* -------------------- SUBMIT -------------------- */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      setInfoMessage("Không có thay đổi nào để lưu.");
      return;
    }

    const schema =
      mode === "create"
        ? onLeaveCreateSchema
        : onLeaveUpdateSchema;

    const result = schema.safeParse(form);

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);

      const firstError = Object.keys(fieldErrors)[0];
      document
        .querySelector(`[name="${firstError}"]`)
        ?.focus();

      return;
    }

    setErrors({});

    const ok = window.confirm(
      mode === "create"
        ? "Bạn có chắc chắn muốn tạo đơn nghỉ?"
        : "Bạn có chắc chắn muốn lưu thay đổi?"
    );

    if (!ok) return;

    onSubmit?.(form);
  };

  const renderError = (field) =>
    errors[field] && (
      <span className="error">{errors[field]}</span>
    );

  /* -------------------- DIRTY CHECK -------------------- */
  const isDirty = useMemo(() => {
    if (mode !== "edit") return true;
    if (!initialSnapshotRef.current) return false;
    return (
      JSON.stringify(form) !==
      JSON.stringify(initialSnapshotRef.current)
    );
  }, [mode, form]);

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h3>
        {mode === "create"
          ? "Tạo đơn nghỉ"
          : "Cập nhật đơn nghỉ"}
      </h3>

      <div className="form-grid">
        {/* NHÂN VIÊN */}
        <div className="form-group full">
        <label>Nhân viên *</label>
        <select
            value={form.employeeCode}
            onChange={handleEmployeeChange}
            disabled={mode === "edit"}
        >
            <option value="">-- Chọn nhân viên --</option>
            {employees.map((e) => (
            <option key={e.code} value={e.code}>
                {e.code} – {e.name}
            </option>
            ))}
        </select>
        {renderError("employeeCode")}
        </div>

        {/* Phòng ban */}
        <div className="form-group">
            <label>Phòng ban</label>
            <input value={form.department} disabled />
        </div>

        {/* Chức vụ */}
        <div className="form-group">
            <label>Chức vụ</label>
            <input value={form.position} disabled />
        </div>

        {/* Loại nghỉ */}
        <div className="form-group">
          <label>Loại nghỉ *</label>
          <select
            name="leaveType"
            value={form.leaveType}
            onChange={handleChange}
          >
            <option value="">-- Chọn --</option>
            <option value="Nghỉ phép">Nghỉ phép</option>
            <option value="Nghỉ không lương">
              Nghỉ không lương
            </option>
            <option value="Nghỉ việc">Nghỉ việc</option>
          </select>
          {renderError("leaveType")}
        </div>

        {/* Từ ngày */}
        <div className="form-group">
          <label>Từ ngày *</label>
          <input
            type="date"
            name="fromDate"
            value={form.fromDate}
            onChange={handleChange}
          />
          {renderError("fromDate")}
        </div>

        {/* Đến ngày */}
        <div className="form-group">
          <label>Đến ngày *</label>
          <input
            type="date"
            name="toDate"
            value={form.toDate}
            onChange={handleChange}
          />
          {renderError("toDate")}
        </div>

        {/* Lý do */}
        <div className="form-group full">
          <label>Lý do</label>
          <textarea
            name="reason"
            value={form.reason}
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
            <option value="Chờ duyệt">Chờ duyệt</option>
            {mode === "edit" && (
              <>
                <option value="Đã duyệt">Đã duyệt</option>
                <option value="Từ chối">Từ chối</option>
              </>
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
          disabled={mode === "edit" && !isDirty}
        >
          <FaSave style={{ marginRight: 5 }} />
          {mode === "create" ? "Tạo đơn" : "Lưu thay đổi"}
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
