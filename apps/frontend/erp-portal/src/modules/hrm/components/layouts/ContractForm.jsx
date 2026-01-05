// apps/frontend/erp-portal/src/modules/hrm/components/layouts/ContractForm.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/form.css";
import {
  contractCreateSchema,
  contractUpdateSchema,
} from "../../validations/contract.schema";
import { FaSave, FaTimes } from "react-icons/fa";
import { employeeService } from "../../services/employee.service";

/* =========================
 * Constants
 * ========================= */

const DEFAULT_FORM = {
  contractCode: "",
  employeeCode: "",
  department: "",
  position: "",
  contractType: "",
  startDate: "",
  endDate: "",
  salary: "",
  status: "Hiệu lực",
};

/* =========================
 * Component
 * ========================= */

export default function ContractForm({
  mode = "create",
  initialData = null,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState("");

  const initialSnapshotRef = useRef(null);

  /* =========================
   * Employees
   * ========================= */

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const list = await employeeService.getAll();
        setEmployees(
          list.filter(
            (e) => !e.deletedAt && e.status === "Đang làm việc"
          )
        );
      } catch {
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);

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
    initialSnapshotRef.current = nextForm;
  }, [mode, initialData]);

  /* =========================
   * Handlers
   * ========================= */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInfoMessage("");
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeChange = (e) => {
    const code = e.target.value;
    setInfoMessage("");

    if (!code) {
      setForm((p) => ({
        ...p,
        employeeCode: "",
        department: "",
        position: "",
      }));
      return;
    }

    const emp = employees.find((e) => e.code === code);
    if (!emp) return;

    setForm((p) => ({
      ...p,
      employeeCode: emp.code,
      department: emp.department || "",
      position: emp.position || "",
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
        ? contractCreateSchema
        : contractUpdateSchema;

    const submitData =
      mode === "create"
        ? { ...form, salary: Number(form.salary) }
        : {
            contractType: form.contractType,
            startDate: form.startDate,
            endDate: form.endDate || undefined,
            salary: Number(form.salary),
            status: form.status,
          };

    const result = schema.safeParse(submitData);

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((i) => {
        fieldErrors[i.path[0]] = i.message;
      });
      setErrors(fieldErrors);

      const firstError = Object.keys(fieldErrors)[0];
      document
        .querySelector(`[name="${firstError}"]`)
        ?.focus();

      return;
    }

    setErrors({});
    setInfoMessage("");

    const ok = window.confirm(
      mode === "create"
        ? "Bạn có chắc chắn muốn tạo hợp đồng này?"
        : "Bạn có chắc chắn muốn lưu thay đổi hợp đồng này?"
    );
    if (!ok) return;

    onSubmit?.(submitData);
  };

  /* =========================
   * Derived state
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
    errors[field] && <span className="error">{errors[field]}</span>;

  /* =========================
   * Render
   * ========================= */

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h3>
        {mode === "create"
          ? "Tạo hợp đồng"
          : "Cập nhật hợp đồng"}
      </h3>

      <div className="form-grid">
        {/* Mã hợp đồng */}
        <div className="form-group">
          <label>Mã hợp đồng *</label>
          <input
            name="contractCode"
            value={form.contractCode}
            onChange={handleChange}
            disabled={mode === "edit"}
          />
          {renderError("contractCode")}
        </div>

        {/* Nhân viên */}
        <div className="form-group">
          <label>Nhân viên *</label>
          <select
            name="employeeCode"
            value={form.employeeCode}
            onChange={handleEmployeeChange}
            disabled={mode === "edit" || loadingEmployees}
          >
            <option value="">
              {loadingEmployees ? "Đang tải..." : "-- Chọn --"}
            </option>
            {employees.map((e) => (
              <option key={e.code} value={e.code}>
                {e.code} - {e.name}
              </option>
            ))}
          </select>
          {renderError("employeeCode")}
        </div>

        <div className="form-group">
          <label>Phòng ban</label>
          <input value={form.department} disabled />
        </div>

        <div className="form-group">
          <label>Chức vụ</label>
          <input value={form.position} disabled />
        </div>

        <div className="form-group">
          <label>Loại hợp đồng *</label>
          <select
            name="contractType"
            value={form.contractType}
            onChange={handleChange}
          >
            <option value="">-- Chọn --</option>
            <option value="Thử việc">Thử việc</option>
            <option value="Xác định thời hạn">
              Xác định thời hạn
            </option>
            <option value="Không xác định thời hạn">
              Không xác định thời hạn
            </option>
          </select>
          {renderError("contractType")}
        </div>

        <div className="form-group">
          <label>Ngày bắt đầu *</label>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
          />
          {renderError("startDate")}
        </div>

        <div className="form-group">
          <label>Ngày kết thúc</label>
          <input
            type="date"
            name="endDate"
            value={form.endDate}
            onChange={handleChange}
          />
          {renderError("endDate")}
        </div>

        <div className="form-group">
          <label>Lương *</label>
          <input
            type="number"
            name="salary"
            value={form.salary}
            onChange={handleChange}
          />
          {renderError("salary")}
        </div>

        <div className="form-group">
          <label>Trạng thái</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            disabled={mode === "create"}
          >
            <option value="Hiệu lực">Hiệu lực</option>
            {mode === "edit" && (
              <>
                <option value="Hết hạn">Hết hạn</option>
                <option value="Huỷ">Huỷ</option>
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
          title={
            mode === "edit" && !isDirty
              ? "Chưa có thay đổi để lưu"
              : ""
          }
        >
          <FaSave /> <span>{mode === "create" ? "Tạo" : "Lưu"}</span>
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