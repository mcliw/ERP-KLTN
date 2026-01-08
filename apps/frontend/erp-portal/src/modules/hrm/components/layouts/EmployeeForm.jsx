// apps/frontend/erp-portal/src/modules/hrm/components/layouts/EmployeeForm.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/form.css";
import {
  employeeCreateSchema,
  employeeUpdateSchema,
} from "../../validations/employee.schema";
import { FaSave, FaTimes } from "react-icons/fa";
import { departmentService } from "../../services/department.service";
import { positionService } from "../../services/position.service";

/* =========================
 * Constants
 * ========================= */

const DEFAULT_FORM = {
  code: "",
  name: "",
  gender: "",
  dob: "",
  hometown: "",
  cccd: "",
  email: "",
  phone: "",
  bankAccountName: "",
  bankAccount: "",
  department: "",
  position: "",
  joinDate: "",
  status: "Đang làm việc",
  avatar: null,
  avatarPreview: "",
  avatarUrl: "",
  cvFile: null,
  cvUrl: "",
  healthCertFile: null,
  healthCertUrl: "",
  degreeFile: null,
  degreeUrl: "",
  contractFile: null,
  contractUrl: "",
};

/* =========================
 * Component
 * ========================= */

export default function EmployeeForm({
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
   * Departments
   * ========================= */

  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const list = await departmentService.getAll();
        setDepartments(
          list.filter((d) => !d.status || d.status === "Hoạt động")
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
   * Positions
   * ========================= */

  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  useEffect(() => {
    if (!form.department) {
      setPositions([]);
      return;
    }

    const loadPositions = async () => {
      try {
        setLoadingPositions(true);
        const list = await positionService.getAll();
        setPositions(
          list.filter(
            (p) =>
              p.status === "Hoạt động" &&
              p.department === form.department
          )
        );
      } catch {
        setPositions([]);
      } finally {
        setLoadingPositions(false);
      }
    };

    loadPositions();
  }, [form.department]);

  /* =========================
   * Edit mode init
   * ========================= */

  useEffect(() => {
    if (mode !== "edit" || !initialData) return;

    const nextForm = {
      ...DEFAULT_FORM,
      ...initialData,
      avatar: null,
      avatarPreview: initialData.avatarUrl || "",

      cvFile: null,
      healthCertFile: null,
      degreeFile: null,
      contractFile: null,
    };

    setForm(nextForm);

    initialSnapshotRef.current = {
      ...nextForm,
      avatar: null,
      avatarPreview: "",
      cvFile: null,
      healthCertFile: null,
      degreeFile: null,
      contractFile: null,
    };
  }, [mode, initialData]);

    /* =========================
   * Auto clear when resigned
   * ========================= */

  useEffect(() => {
    if (form.status === "Nghỉ việc") {
      setForm((prev) => ({
        ...prev,
        department: "",
        position: "",
      }));
    }
  }, [form.status]);

  /* =========================
   * Handlers
   * ========================= */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInfoMessage("");

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "department" ? { position: "" } : null),
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        avatar: file,
        avatarPreview: reader.result,
        avatarUrl: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handlePdfUpload = (fieldFile, fieldUrl) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Chỉ cho phép tải file PDF");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        [fieldFile]: file,
        [fieldUrl]: reader.result, // base64
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      setInfoMessage("Không có thay đổi nào để lưu.");
      return;
    }

    const schema =
      mode === "create"
        ? employeeCreateSchema
        : employeeUpdateSchema;

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

      const firstError = Object.keys(fieldErrors)[0];
      document
        .querySelector(`[name="${Object.keys(fieldErrors)[0]}"]`)
        ?.focus();

      return;
    }

    setErrors({});
    setInfoMessage("");

    const ok = window.confirm(
      mode === "create"
        ? "Bạn có chắc chắn muốn tạo hồ sơ nhân viên này?"
        : "Bạn có chắc chắn muốn lưu thay đổi hồ sơ nhân viên này?"
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

    const current = {
      ...form,
      avatar: null,
      avatarPreview: "",
    };

    return (
      JSON.stringify(current) !==
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
          ? "Tạo hồ sơ nhân viên"
          : "Cập nhật hồ sơ nhân viên"}
      </h3>

      {/* Avatar */}
      <div className="avatar-row">
        <div className="avatar-preview">
          {form.avatarPreview ? (
            <img src={form.avatarPreview} alt="Avatar" />
          ) : (
            <div className="avatar-placeholder">Ảnh hồ sơ</div>
          )}
        </div>

        <div className="avatar-actions">
          <input type="file" accept="image/*" onChange={handleAvatarChange} />
        </div>
      </div>

      {/* ==== FORM GRID ==== */}
      {/* (phần JSX field giữ nguyên như bạn đã viết – không thay đổi UI) */}
      <div className="form-grid">
        {/* Mã NV */}
        <div className="form-group">
          <label>Mã nhân viên *</label>
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            disabled={mode === "edit"}
          />
          {renderError("code")}
        </div>

        {/* Họ tên */}
        <div className="form-group">
          <label>Họ tên *</label>
          <input name="name" value={form.name} onChange={handleChange} />
          {renderError("name")}
        </div>

        {/* Giới tính */}
        <div className="form-group">
          <label>Giới tính *</label>
          <select name="gender" value={form.gender} onChange={handleChange}>
            <option value="">-- Chọn --</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
            <option value="Khác">Khác</option>
          </select>
          {renderError("gender")}
        </div>

        {/* Ngày sinh */}
        <div className="form-group">
          <label>Ngày sinh</label>
          <input type="date" name="dob" value={form.dob} onChange={handleChange} />
        </div>

        {/* Quê quán */}
        <div className="form-group">
          <label>Quê quán</label>
          <input
            name="hometown"
            value={form.hometown}
            onChange={handleChange}
          />
        </div>

        {/* CCCD */}
        <div className="form-group">
          <label>Số CCCD</label>
          <input name="cccd" value={form.cccd} onChange={handleChange} />
          {renderError("cccd")}
        </div>

        {/* Email */}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
          {renderError("email")}
        </div>

        {/* SĐT */}
        <div className="form-group">
          <label>Số điện thoại</label>
          <input name="phone" value={form.phone} onChange={handleChange} />
          {renderError("phone")}
        </div>

        {/* STK */}
        <div className="form-group">
          <label>Số tài khoản ngân hàng *</label>
          <input
            name="bankAccount"
            value={form.bankAccount}
            onChange={handleChange}
          />
          {renderError("bankAccount")}
        </div>

        {/* Tên TK */}
        <div className="form-group">
          <label>Tên tài khoản ngân hàng *</label>
          <input
            name="bankAccountName"
            value={form.bankAccountName}
            onChange={handleChange}
          />
          {renderError("bankAccountName")}
        </div>

        {/* Phòng ban */}
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

        {/* Chức vụ */}
        <div className="form-group">
          <label>Chức vụ *</label>
          <select
            name="position"
            value={form.position}
            onChange={handleChange}
            disabled={!form.department || loadingPositions}
          >
            <option value="">
              {!form.department
                ? "-- Chọn phòng ban trước --"
                : loadingPositions
                ? "Đang tải..."
                : "-- Chọn --"}
            </option>

            {positions.map((p) => {
              const assigned = p.assigneeCount ?? 0;
              const capacity = p.capacity ?? 1;
              const isFull = assigned >= capacity;

              return (
                <option
                  key={p.code}
                  value={p.code}
                  disabled={isFull}
                >
                  {p.name} {isFull ? "(Đã đủ)" : ""}
                </option>
              );
            })}
          </select>
          {renderError("position")}
        </div>

        {/* Ngày vào */}
        <div className="form-group">
          <label>Ngày vào làm *</label>
          <input
            type="date"
            name="joinDate"
            value={form.joinDate}
            onChange={handleChange}
          />
          {renderError("joinDate")}
        </div>

        {/* Trạng thái */}
        <div className="form-group">
          <label>Trạng thái</label>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="Đang làm việc">Đang làm việc</option>

            {mode === "edit" && (
                <option value="Nghỉ việc">Nghỉ việc</option>
            )}
            </select>
        </div>

        {/* ==== HỒ SƠ GIẤY TỜ ==== */}
        <div className="form-group">
          <label>Hợp đồng lao động (PDF)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload("contractFile", "contractUrl")}
          />

          {form.contractUrl && (
            <a href={form.contractUrl} target="_blank" rel="noreferrer">
              Xem hợp đồng
            </a>
          )}
        </div>

        <div className="form-group">
          <label>CV (PDF)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload("cvFile", "cvUrl")}
          />
          {form.cvUrl && (
            <a href={form.cvUrl} target="_blank" rel="noreferrer">
              Xem CV
            </a>
          )}
        </div>

        <div className="form-group">
          <label>Giấy khám sức khỏe (PDF)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload(
              "healthCertFile",
              "healthCertUrl"
            )}
          />
          {form.healthCertUrl && (
            <a href={form.healthCertUrl} target="_blank" rel="noreferrer">
              Xem giấy khám
            </a>
          )}
        </div>

        <div className="form-group">
          <label>Bằng cấp / Chứng chỉ (PDF)</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload("degreeFile", "degreeUrl")}
          />
          {form.degreeUrl && (
            <a href={form.degreeUrl} target="_blank" rel="noreferrer">
              Xem bằng cấp
            </a>
          )}
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
          <FaSave />{" "}
          <span>{mode === "create" ? "Tạo hồ sơ" : "Lưu thay đổi"}</span>
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