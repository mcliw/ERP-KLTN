// apps/frontend/erp-portal/src/modules/hrm/components/layouts/AccountForm.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/form.css";
import {
  accountCreateSchema,
  accountUpdateSchema,
} from "../../validations/account.schema";
import { FaSave, FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import { employeeService } from "../../services/employee.service";

const DEFAULT_FORM = {
  username: "",
  employeeCode: "",
  department: "",
  position: "",
  role: "",
  status: "Hoạt động",
  password: "",
  confirmPassword: "",
};

export default function AccountForm({
  mode = "create",
  initialData = null,
  roleOptions = [],
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [infoMessage, setInfoMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const initialSnapshotRef = useRef(null);

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
      } catch (err) {
        console.error("Không tải được danh sách nhân viên", err);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };
    loadEmployees();
  }, []);

  /* ================= LOAD EDIT DATA ================= */
  useEffect(() => {
    if (mode === "edit" && initialData) {
      const nextForm = {
        ...DEFAULT_FORM,
        ...initialData,
        // edit: để trống password / confirmPassword
        password: "",
        confirmPassword: "",
      };
      setForm(nextForm);
      initialSnapshotRef.current = { ...nextForm };
    }
  }, [mode, initialData]);

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setInfoMessage("");

    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeChange = (e) => {
    const code = e.target.value;

    if (!code) {
      setForm((prev) => ({
        ...prev,
        employeeCode: "",
        department: "",
        position: "",
      }));
      return;
    }

    const emp = employees.find((x) => x.code === code);
    if (!emp) return;

    setInfoMessage("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next.employeeCode;
      return next;
    });

    setForm((prev) => ({
      ...prev,
      employeeCode: emp.code,
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
      JSON.stringify(form) !== JSON.stringify(initialSnapshotRef.current)
    );
  }, [mode, form]);

  /* ================= SUBMIT ================= */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      setInfoMessage("Không có thay đổi nào để lưu.");
      return;
    }

    const pw = String(form.password || "");
    const cpw = String(form.confirmPassword || "");

    // ✅ CHECK PASSWORD RULES (giữ đúng logic bạn đang dùng)
    if (mode === "create") {
      if (!pw) {
        setErrors((prev) => ({ ...prev, password: "Mật khẩu bắt buộc" }));
        document.querySelector(`[name="password"]`)?.focus();
        return;
      }
      if (!cpw) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Vui lòng xác nhận mật khẩu",
        }));
        document.querySelector(`[name="confirmPassword"]`)?.focus();
        return;
      }
      if (pw !== cpw) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Mật khẩu xác nhận không khớp",
        }));
        document.querySelector(`[name="confirmPassword"]`)?.focus();
        return;
      }
    }

    if (mode === "edit") {
      const hasAny = !!pw || !!cpw;
      if (hasAny) {
        if (!pw) {
          setErrors((prev) => ({
            ...prev,
            password: "Vui lòng nhập mật khẩu mới",
          }));
          document.querySelector(`[name="password"]`)?.focus();
          return;
        }
        if (!cpw) {
          setErrors((prev) => ({
            ...prev,
            confirmPassword: "Vui lòng xác nhận mật khẩu mới",
          }));
          document.querySelector(`[name="confirmPassword"]`)?.focus();
          return;
        }
        if (pw !== cpw) {
          setErrors((prev) => ({
            ...prev,
            confirmPassword: "Mật khẩu xác nhận không khớp",
          }));
          document.querySelector(`[name="confirmPassword"]`)?.focus();
          return;
        }
      }
    }

    const schema =
      mode === "create" ? accountCreateSchema : accountUpdateSchema;

    // ❗ LOẠI confirmPassword TRƯỚC KHI VALIDATE
    const { confirmPassword, ...payload } = form;

    const result = schema.safeParse(payload);

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((err) => {
        fieldErrors[err.path[0]] = err.message;
      });

      setErrors(fieldErrors);

      const firstErrorField = Object.keys(fieldErrors)[0];
      document.querySelector(`[name="${firstErrorField}"]`)?.focus();
      return;
    }

    setErrors({});

    const confirmMessage =
      mode === "create"
        ? "Bạn có chắc chắn muốn tạo tài khoản này?"
        : "Bạn có chắc chắn muốn lưu thay đổi tài khoản này?";

    if (!window.confirm(confirmMessage)) return;

    onSubmit?.(payload);
  };

  /* ================= RENDER ================= */
  return (
    <form className="department-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo tài khoản" : "Cập nhật tài khoản"}</h3>

      <div className="form-grid">
        {/* Username */}
        <div className="form-group">
          <label>Tên đăng nhập *</label>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            disabled={mode === "edit"}
          />
          {renderError("username")}
        </div>

        {/* Nhân viên */}
        <div className="form-group">
          <label>Nhân viên *</label>
          <select
            value={form.employeeCode}
            onChange={handleEmployeeChange}
            disabled={loadingEmployees || mode === "edit"}
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

        {/* Mật khẩu */}
        <div className="form-group">
          <label>Mật khẩu {mode === "create" && "*"}</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder={mode === "edit" ? "Để trống nếu không đổi" : ""}
              style={{ width: "100%" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Xem mật khẩu"}
              title={showPassword ? "Ẩn mật khẩu" : "Xem mật khẩu"}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {renderError("password")}
        </div>

        {/* Phân quyền */}
        <div className="form-group">
          <label>Phân quyền *</label>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="">-- Chọn quyền --</option>
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {renderError("role")}
        </div>

        {/* Xác nhận mật khẩu */}
        <div className="form-group">
          <label>Xác nhận mật khẩu {mode === "create" && "*"}</label>
          <div style={{ position: "relative" }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder={mode === "edit" ? "Để trống nếu không đổi" : ""}
              style={{ width: "100%" }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={
                showConfirmPassword ? "Ẩn xác nhận mật khẩu" : "Xem xác nhận mật khẩu"
              }
              title={showConfirmPassword ? "Ẩn" : "Xem"}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {renderError("confirmPassword")}
        </div>

        {/* Trạng thái */}
        <div className="form-group">
          <label>Trạng thái</label>
          <select name="status" value={form.status} onChange={handleChange}>
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
          disabled={mode === "edit" && !isDirty}
          title={mode === "edit" && !isDirty ? "Chưa có thay đổi để lưu" : ""}
        >
          <FaSave style={{ marginRight: 5 }} />
          {mode === "create" ? "Tạo tài khoản" : "Lưu thay đổi"}
        </button>

        <button type="button" className="btn-secondary" onClick={onCancel}>
          <FaTimes />
          <span>Hủy</span>
        </button>
      </div>
    </form>
  );
}
