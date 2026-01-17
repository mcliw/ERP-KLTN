// apps/frontend/erp-portal/src/modules/hrm/components/layouts/AccountForm.jsx

import { useMemo, useEffect, useState, useCallback } from "react";
import { accountCreateSchema, accountUpdateSchema } from "../../validations/account.schema";
import {
  useFormManager,
  FormInput,
  FormSelect,
  FormPassword,
  FormActions,
} from "../common/FormCommon";
import { employeeService } from "../../services/employee.service";
import { positionService } from "../../services/position.service";
import { departmentService } from "../../services/department.service";
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

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

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

/* ==============================
 * Main Component
 * ============================== */
export default function AccountForm({
  mode = "create",
  initialData,
  roleOptions = [],
  onSubmit,
  onCancel,
}) {
  const toast = useToast();

  // Data State
  const [employees, setEmployees] = useState([]);
  const [positionMap, setPositionMap] = useState({});
  const [departmentMap, setDepartmentMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  const safeInitialValues = useMemo(() => {
    if (mode !== "edit") return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return {
      ...DEFAULT_FORM,
      ...cleaned,
      password: "",
      confirmPassword: "",
    };
  }, [mode, initialData]);

  const { form, setForm, errors, setErrors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: mode === "create" ? accountCreateSchema : accountUpdateSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setForm((prev) => ({
        ...prev,
        ...cleanData(initialData),
        password: "",
        confirmPassword: "",
      }));
    }
  }, [mode, initialData, setForm]);

  // Load Data
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [empList, posList, deptList] = await Promise.all([
          employeeService.getAll(),
          positionService.getAll(),
          departmentService.getAll(),
        ]);

        const activeEmps = (empList || []).filter(
          (e) => !e.status || e.status === "Đang làm việc"
        );
        if (mounted) setEmployees(activeEmps);

        const posMap = {};
        (posList || []).forEach((p) => {
          posMap[normalizeCode(p.code)] = p.name;
        });
        if (mounted) setPositionMap(posMap);

        const deptMap = {};
        (deptList || []).forEach((d) => {
          deptMap[normalizeCode(d.code)] = d.name;
        });
        if (mounted) setDepartmentMap(deptMap);
      } catch (err) {
        console.error("Lỗi tải dữ liệu form tài khoản", err);
        if (mounted) {
          setEmployees([]);
          setPositionMap({});
          setDepartmentMap({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleEmployeeChange = useCallback(
    (e) => {
      const code = e.target.value;
      const emp = employees.find((x) => normalizeCode(x.code) === normalizeCode(code));

      if (!code || !emp) {
        setForm((prev) => ({
          ...prev,
          employeeCode: "",
          department: "",
          position: "",
        }));
        setErrors?.((prev) => ({ ...prev, employeeCode: undefined }));
        return;
      }

      setForm((prev) => ({
        ...prev,
        employeeCode: emp.code,
        department: emp.department || "",
        position: emp.position || "",
      }));

      setErrors?.((prev) => ({ ...prev, employeeCode: undefined }));
    },
    [employees, setForm, setErrors]
  );

  const validatePasswordIfNeeded = () => {
    const pw = String(form.password || "");
    const cpw = String(form.confirmPassword || "");

    const needPassword = mode === "create" || (mode === "edit" && (pw || cpw));
    if (!needPassword) return true;

    if (!pw) {
      setErrors?.((p) => ({ ...p, password: "Mật khẩu bắt buộc" }));
      return false;
    }
    if (pw.length < 6) {
      setErrors?.((p) => ({ ...p, password: "Mật khẩu phải ít nhất 6 ký tự" }));
      return false;
    }
    if (pw !== cpw) {
      setErrors?.((p) => ({ ...p, confirmPassword: "Mật khẩu xác nhận không khớp" }));
      return false;
    }

    // clear errors if ok
    setErrors?.((p) => ({ ...p, password: undefined, confirmPassword: undefined }));
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    setInfoMessage("");

    if (!validatePasswordIfNeeded()) return;

    // payload: bỏ confirmPassword
    const { confirmPassword, ...payload } = {
      username: form.username ?? "",
      employeeCode: form.employeeCode ?? "",
      department: form.department ?? "",
      position: form.position ?? "",
      role: form.role ?? "",
      status: form.status ?? "Hoạt động",
      password: form.password ?? "",
      confirmPassword: form.confirmPassword ?? "",
    };

    if (!validate(payload)) return;

    if (!window.confirm(mode === "create" ? "Tạo tài khoản?" : "Lưu thay đổi?")) return;

    onSubmit?.(payload);
  };

  const resolve = (map, code) => map[normalizeCode(code)] || "—";

  return (
    <form className="account-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo tài khoản" : "Cập nhật tài khoản"}</h3>

      <div className="form-grid">
        <FormInput
          label="Tên đăng nhập"
          name="username"
          value={form.username}
          onChange={handleChange}
          required
          disabled={mode === "edit"}
          error={errors.username}
        />

        <FormSelect
          label="Nhân viên"
          name="employeeCode"
          value={form.employeeCode}
          onChange={handleEmployeeChange}
          required
          disabled={loading || mode === "edit"}
          error={errors.employeeCode}
        >
          <option value="">
            {loading ? "Đang tải..." : "-- Chọn --"}
          </option>
          {employees.map((e) => (
            <option key={e.code} value={e.code}>
              {e.code} - {e.name}
            </option>
          ))}
        </FormSelect>

        <FormInput label="Phòng ban" value={resolve(departmentMap, form.department)} disabled />
        <FormInput label="Chức vụ" value={resolve(positionMap, form.position)} disabled />

        <FormPassword
          label="Mật khẩu"
          name="password"
          value={form.password}
          onChange={handleChange}
          required={mode === "create"}
          error={errors.password}
          placeholder={mode === "edit" ? "Để trống nếu không đổi" : ""}
        />

        <FormPassword
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          required={mode === "create"}
          error={errors.confirmPassword}
        />

        <FormSelect
          label="Phân quyền"
          name="role"
          value={form.role}
          onChange={handleChange}
          required
          options={roleOptions}
          error={errors.role}
        />

        <FormSelect
          label="Trạng thái"
          name="status"
          value={form.status}
          onChange={handleChange}
          error={errors.status}
        >
          <option value="Hoạt động">Hoạt động</option>
          {mode === "edit" && <option value="Ngưng hoạt động">Ngưng hoạt động</option>}
        </FormSelect>
      </div>

      {infoMessage && <div className="info-message">{infoMessage}</div>}

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo tài khoản" : "Lưu thay đổi"}
      />
    </form>
  );
}
