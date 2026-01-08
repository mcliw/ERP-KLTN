// apps/frontend/erp-portal/src/modules/hrm/components/layouts/OnLeaveForm.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/form.css";
import { FaSave, FaTimes } from "react-icons/fa";

import { employeeService } from "../../services/employee.service";
import { departmentService } from "../../services/department.service";
import { positionService } from "../../services/position.service";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";

import {
  onLeaveCreateSchema,
  onLeaveUpdateSchema,
} from "../../validations/onLeave.schema";

/* ================= DEFAULT ================= */
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
  currentUser = null,
  onSubmit,
  onCancel,
}) {
  const canUpdateStatus = useMemo(() => {
    if (!currentUser) console.warn("OnLeaveForm: currentUser is missing!");
    return HRM_PERMISSIONS.LEAVE_EDIT.includes(currentUser?.role);
  }, [currentUser]);

  const canChooseEmployee = useMemo(() => {
    if (!currentUser) console.warn("OnLeaveForm: currentUser is missing!");
    return HRM_PERMISSIONS.LEAVE_EDIT.includes(currentUser?.role);
  }, [currentUser]);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState("");

  const initialSnapshotRef = useRef(null);

  /* ================= LOAD MAPS ================= */
  const [departmentMap, setDepartmentMap] = useState({});
  const [positionMap, setPositionMap] = useState({});

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const list = await departmentService.getAll();
        const map = {};
        list.forEach((d) => (map[d.code] = d.name));
        setDepartmentMap(map);
      } catch {
        setDepartmentMap({});
      }
    };

    const loadPositions = async () => {
      try {
        const list = await positionService.getAll();
        const map = {};
        list.forEach((p) => (map[p.code] = p.name));
        setPositionMap(map);
      } catch {
        setPositionMap({});
      }
    };

    loadDepartments();
    loadPositions();
  }, []);

  /* ================= LOAD EMPLOYEES ================= */
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const list = await employeeService.getAll();
        const active = list.filter(
          (e) => !e.status || e.status === "Đang làm việc"
        );
        setEmployees(active);

        if (mode === "create" && currentUser?.employeeCode) {
           const myInfo = active.find(e => e.code === currentUser.employeeCode);
           
           setForm(prev => ({
             ...prev,
             employeeCode: currentUser.employeeCode, // Mã NV từ tài khoản
             employeeName: currentUser.name,         // Tên từ tài khoản
             // Lấy phòng ban/chức vụ từ danh sách nhân viên (nếu tìm thấy)
             department: myInfo?.department || "",   
             position: myInfo?.position || ""
           }));
        }
      } catch {
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, [mode, currentUser]);

  /* ================= LOAD EDIT DATA ================= */
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const nextForm = { ...DEFAULT_FORM, ...initialData };
      setForm(nextForm);
      initialSnapshotRef.current = { ...nextForm };
    }
  }, [mode, initialData]);

  /* ================= HANDLERS ================= */
  const clearFieldError = (name) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInfoMessage("");
    clearFieldError(name);

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeChange = (e) => {
    const code = e.target.value;
    setInfoMessage("");
    clearFieldError("employeeCode");

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

    const emp = employees.find((x) => x.code === code);
    if (!emp) return;

    setForm((prev) => ({
      ...prev,
      employeeCode: emp.code,
      employeeName: emp.name,
      department: emp.department || "",
      position: emp.position || "",
    }));
  };

  const renderError = (field) =>
    errors[field] && <span className="error">{errors[field]}</span>;

  /* ================= DIRTY CHECK ================= */
  const isDirty = useMemo(() => {
    if (mode !== "edit") return true;
    if (!initialSnapshotRef.current) return false;
    return (
      JSON.stringify(form) !==
      JSON.stringify(initialSnapshotRef.current)
    );
  }, [mode, form]);

  /* ================= SUBMIT ================= */
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

    const confirmMessage =
      mode === "create"
        ? "Bạn có chắc chắn muốn tạo đơn nghỉ?"
        : "Bạn có chắc chắn muốn lưu thay đổi đơn nghỉ?";

    if (!window.confirm(confirmMessage)) return;

    onSubmit?.(form);
  };

  /* ================= RENDER ================= */
  const isEmployeeSelectDisabled = !canChooseEmployee || loadingEmployees || mode === "edit";

  return (
    <form className="department-form" onSubmit={handleSubmit}>
      <h3>
        {mode === "create" ? "Tạo đơn nghỉ" : "Cập nhật đơn nghỉ"}
      </h3>

      <div className="form-grid">
        {/* Nhân viên */}
        <div className="form-group full">
          <label>Nhân viên *</label>
          <select
            value={form.employeeCode}
            onChange={handleEmployeeChange}
            disabled={isEmployeeSelectDisabled}
            style={isEmployeeSelectDisabled ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" } : {}}
          >
            {/* Nếu đang loading hoặc chưa có list, vẫn hiện option của user hiện tại để không bị trống */}
            {mode === 'create' && currentUser && !employees.length && (
                <option value={currentUser.employeeCode}>
                    {currentUser.employeeCode} - {currentUser.name}
                </option>
            )}
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

        {/* Phòng ban */}
        <div className="form-group">
          <label>Phòng ban</label>
          <input
            value={departmentMap[form.department] || "—"}
            disabled
            style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
          />
        </div>

        {/* Chức vụ */}
        <div className="form-group">
          <label>Chức vụ</label>
          <input
            value={positionMap[form.position] || "—"}
            disabled
            style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
          />
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
          <label>Lý do *</label>
          <textarea
            name="reason"
            value={form.reason}
            onChange={handleChange}
          />
          {renderError("reason")}
        </div>

        {/* Trạng thái */}
        <div className="form-group">
          <label>Trạng thái</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            disabled={mode === "create" || !canUpdateStatus}
            style={(mode === "create" || !canUpdateStatus) ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" } : {}}
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
          title={mode === "edit" && !isDirty ? "Chưa có thay đổi để lưu" : ""}
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