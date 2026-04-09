// apps/frontend/erp-portal/src/modules/hrm/components/layouts/EmployeeForm.jsx

import { useMemo, useEffect, useState, useCallback } from "react";
import { employeeCreateSchema, employeeUpdateSchema } from "../../validations/employee.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { departmentService } from "../../services/department.service";
import { positionService } from "../../services/position.service";
import { useToast } from "../../../../shared/components/ToastProvider";

/* ==============================
 * Helpers & Configs
 * ============================== */
const cleanData = (data) => {
  if (!data) return {};
  const cleaned = {};
  Object.keys(data).forEach((key) => {
    cleaned[key] = data[key] === null || data[key] === undefined ? "" : data[key];
  });
  return cleaned;
};

const DEFAULT_FORM = {
  code: "", name: "", gender: "", dob: "", hometown: "", cccd: "", email: "", phone: "",
  bankAccountName: "", bankAccount: "", department: "", position: "", joinDate: "", status: "Đang làm việc",
  avatar: null, avatarPreview: "", avatarUrl: "",
  cvFile: null, cvUrl: "",
  healthCertFile: null, healthCertUrl: "",
  degreeFile: null, degreeUrl: "",
  contractFile: null, contractUrl: "",
};

const FILE_FIELDS = [
  { label: "Hợp đồng (PDF)", fileKey: "contractFile", urlKey: "contractUrl" },
  { label: "CV (PDF)", fileKey: "cvFile", urlKey: "cvUrl" },
  { label: "Giấy khám SK (PDF)", fileKey: "healthCertFile", urlKey: "healthCertUrl" },
  { label: "Bằng cấp (PDF)", fileKey: "degreeFile", urlKey: "degreeUrl" },
];

/* ==============================
 * Main Component
 * ============================== */
export default function EmployeeForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingPos, setLoadingPos] = useState(false);
  const toast = useToast();

  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return {
      ...DEFAULT_FORM,
      ...cleaned,
      avatarPreview: cleaned.avatarUrl || cleaned.avatar || "",
    };
  }, [initialData]);

  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: mode === "create" ? employeeCreateSchema : employeeUpdateSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({
        ...prev,
        ...cleanData(initialData),
        avatarPreview: initialData.avatarUrl || initialData.avatar || prev.avatarPreview,
      }));
    }
  }, [initialData, setForm]);

  useEffect(() => {
    let mounted = true;
    const loadDepts = async () => {
      setLoadingDepts(true);
      try {
        const list = await departmentService.getAll();
        if (mounted) setDepartments(list.filter((d) => d.status === "Hoạt động"));
      } catch (err) {
        console.error("Failed to load departments", err);
        if (mounted) setDepartments([]);
      } finally {
        if (mounted) setLoadingDepts(false);
      }
    };
    loadDepts();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!form.department) {
      setPositions([]);
      return;
    }

    let mounted = true;
    const loadPos = async () => {
      setLoadingPos(true);
      try {
        const list = await positionService.getAll();
        if (mounted) {
          setPositions(list.filter((p) => p.status === "Hoạt động" && p.department === form.department));
        }
      } catch (err) {
        console.error("Failed to load positions", err);
        if (mounted) setPositions([]);
      } finally {
        if (mounted) setLoadingPos(false);
      }
    };

    loadPos();
    return () => { mounted = false; };
  }, [form.department]);

  const handleDeptChange = useCallback((e) => {
    const newDept = e.target.value;
    setForm((prev) => ({
      ...prev,
      department: newDept,
      position: "",
    }));
  }, [setForm]);

  const handleFileChange = (fieldFile, fieldUrl, type = "file") => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "pdf" && file.type !== "application/pdf") {
      alert("Chỉ cho phép file PDF");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((p) => ({
        ...p,
        [fieldFile]: file,
        [fieldUrl]: reader.result,
        ...(fieldFile === "avatar" ? { avatarPreview: reader.result } : {}),
      }));
    };
    reader.readAsDataURL(file);
  };

  const normalizeSubmitData = (payload) => {
    const {
      avatar, cvFile, healthCertFile, degreeFile, contractFile,
      avatarPreview,
      ...rest
    } = payload;

    const out = {};
    Object.keys(rest).forEach((k) => {
      out[k] = rest[k] ?? "";
    });
    return out;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    const payload = normalizeSubmitData(form);
    const submitData = mode === "edit" ? (({ code, ...rest }) => rest)(payload) : payload;

    if (!validate(submitData)) return;

    if (!window.confirm(mode === "create" ? "Xác nhận tạo hồ sơ mới?" : "Lưu các thay đổi?")) return;

    onSubmit?.(submitData);
  };

  const renderPositionOptions = () => {
    if (loadingPos) return <option>Đang tải...</option>;
    if (positions.length === 0) return <option value="">-- Không có chức vụ --</option>;

    return (
      <>
        <option value="">-- Chọn chức vụ --</option>
        {positions.map((p) => {
          const currentCount = p.assigneeCount; // có thì hiển thị, không có thì chỉ show capacity
          const capacity = p.capacity || 1;

          const isFull =
            typeof currentCount === "number" ? currentCount >= capacity : false;

          const isCurrentPosition = form.position === p.code;
          const isDisabled = isFull && !isCurrentPosition;

          const suffix =
            typeof currentCount === "number"
              ? (isFull ? "(Đủ nhân sự)" : `(${currentCount}/${capacity})`)
              : `(tối đa ${capacity})`;

          return (
            <option key={p.code} value={p.code} disabled={isDisabled}>
              {p.name} {suffix}
            </option>
          );
        })}
      </>
    );
  };

  const isWorking = form.status === "Đang làm việc";

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo hồ sơ nhân viên" : "Cập nhật hồ sơ nhân viên"}</h3>

      {/* Avatar Section */}
      <div className="avatar-row">
        <div className="avatar-preview">
          {form.avatarPreview ? (
            <img src={form.avatarPreview} alt="Avatar" />
          ) : (
            <div className="avatar-placeholder">Ảnh 3x4</div>
          )}
        </div>
        <div className="avatar-actions">
          <label className="btn-upload">
            Chọn ảnh
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange("avatar", "avatarUrl", "image")}
              hidden
            />
          </label>
        </div>
      </div>

      {/* Main Info */}
      <div className="form-grid">
        <FormInput
          label="Mã nhân viên"
          name="code"
          value={form.code}
          onChange={handleChange}
          required
          disabled={mode === "edit"}
          error={errors.code}
        />

        <FormInput
          label="Họ tên"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          error={errors.name}
        />

        <FormSelect
          label="Giới tính"
          name="gender"
          value={form.gender}
          onChange={handleChange}
          required
          error={errors.gender}
        >
          <option value="">-- Chọn giới tính --</option>
          <option value="Nam">Nam</option>
          <option value="Nữ">Nữ</option>
          <option value="Khác">Khác</option>
        </FormSelect>

        <FormInput type="date" label="Ngày sinh" name="dob" value={form.dob} onChange={handleChange} />
        <FormInput label="Quê quán" name="hometown" value={form.hometown} onChange={handleChange} />
        <FormInput label="Số CCCD" name="cccd" value={form.cccd} onChange={handleChange} error={errors.cccd} />
        <FormInput type="email" label="Email" name="email" value={form.email} onChange={handleChange} error={errors.email} />
        <FormInput label="SĐT" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} />

        <FormInput
          label="Tên ngân hàng"
          name="bankAccountName"
          value={form.bankAccountName}
          onChange={handleChange}
          required
          error={errors.bankAccountName}
        />
        <FormInput
          label="Số tài khoản"
          name="bankAccount"
          value={form.bankAccount}
          onChange={handleChange}
          required
          error={errors.bankAccount}
        />

        <FormSelect
          label="Phòng ban"
          name="department"
          value={form.department}
          onChange={handleDeptChange}
          required
          disabled={loadingDepts}
          error={errors.department}
        >
          <option value="">-- Chọn phòng ban --</option>
          {departments.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </FormSelect>

        <FormSelect
          label="Chức vụ"
          name="position"
          value={form.position}
          onChange={handleChange}
          required
          disabled={!form.department || loadingPos}
          error={errors.position}
        >
          {renderPositionOptions()}
        </FormSelect>

        <FormInput
          type="date"
          label="Ngày vào làm"
          name="joinDate"
          value={form.joinDate}
          onChange={handleChange}
          required
          error={errors.joinDate}
        />

        <FormSelect label="Trạng thái" name="status" value={form.status} onChange={handleChange}>
          <option value="Đang làm việc">Đang làm việc</option>
          {mode === "edit" && <option value="Nghỉ việc">Nghỉ việc</option>}
        </FormSelect>
      </div>

      {/* File Upload Section */}
      <div className="form-grid" style={{ marginTop: 20 }}>
        {FILE_FIELDS.map((item) => {
          const required = item.urlKey === "contractUrl" && isWorking;

          return (
            <div key={item.fileKey} className="form-group file-input-group">
              <label>
                {item.label} {required && <span style={{ color: "#dc2626" }}>*</span>}
              </label>

              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange(item.fileKey, item.urlKey, "pdf")}
              />

              {form[item.urlKey] && (
                <div className="file-status">
                  <span className="success-icon" style={{ color: "green" }}>
                    ✔ Đã chọn file
                  </span>

                  {!String(form[item.urlKey]).startsWith("data:") && (
                    <a
                      href={form[item.urlKey]}
                      target="_blank"
                      rel="noreferrer"
                      className="view-file-link"
                    >
                      Xem file hiện tại
                    </a>
                  )}
                </div>
              )}

              {errors[item.urlKey] && (
                <span className="error-text" style={{ color: "red", marginTop: 5, display: "block" }}>
                  {errors[item.urlKey]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo hồ sơ" : "Lưu thay đổi"}
      />
    </form>
  );
}
