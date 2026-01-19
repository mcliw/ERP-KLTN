// apps/frontend/erp-portal/src/modules/hrm/components/layouts/OnLeaveForm.jsx

import { useEffect, useMemo, useState, useCallback } from "react";
import { onLeaveCreateSchema, onLeaveUpdateSchema } from "../../validations/onLeave.schema";
import {
  useFormManager,
  FormInput,
  FormSelect,
  FormTextarea,
  FormActions,
} from "../../../../shared/components/FormCommon";
import { employeeService } from "../../services/employee.service";
import { departmentService } from "../../services/department.service";
import { positionService } from "../../services/position.service";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
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

/* ==============================
 * Main Component
 * ============================== */
export default function OnLeaveForm({
  mode = "create",
  initialData,
  currentUser,
  onSubmit,
  onCancel,
}) {
  const toast = useToast();

  const canUpdateStatus = useMemo(
    () => HRM_PERMISSIONS.HRM_LEAVE_UPDATE.includes(currentUser?.role),
    [currentUser]
  );

  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return { ...DEFAULT_FORM, ...cleaned };
  }, [initialData]);

  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: mode === "create" ? onLeaveCreateSchema : onLeaveUpdateSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  const [employees, setEmployees] = useState([]);
  const [deptMap, setDeptMap] = useState({});
  const [posMap, setPosMap] = useState({});
  const [loading, setLoading] = useState(false);

  const resolve = (map, code) => map[normalizeCode(code)] || code || "—";

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({ ...prev, ...cleanData(initialData) }));
    }
  }, [initialData, setForm]);

  // Load Data
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [emps, depts, poss] = await Promise.all([
          employeeService.getAll(),
          departmentService.getAll(),
          positionService.getAll(),
        ]);

        if (!mounted) return;

        setEmployees((emps || []).filter((e) => e.status !== "Nghỉ việc"));

        const dMap = {};
        (depts || []).forEach((d) => {
          dMap[normalizeCode(d.code)] = d.name;
        });
        setDeptMap(dMap);

        const pMap = {};
        (poss || []).forEach((p) => {
          pMap[normalizeCode(p.code)] = p.name;
        });
        setPosMap(pMap);

        // Auto-fill current user info in create mode (if any)
        if (mode === "create" && currentUser?.employeeCode) {
          const me = (emps || []).find(
            (e) => normalizeCode(e.code) === normalizeCode(currentUser.employeeCode)
          );

          setForm((prev) => ({
            ...prev,
            employeeCode: currentUser.employeeCode,
            employeeName: currentUser.name || me?.name || prev.employeeName,
            department: me?.department || prev.department || "",
            position: me?.position || prev.position || "",
          }));
        }
      } catch (e) {
        console.error("Lỗi tải dữ liệu form đơn nghỉ", e);
        if (mounted) {
          setEmployees([]);
          setDeptMap({});
          setPosMap({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [mode, currentUser, setForm]);

  const handleEmployeeChange = useCallback(
    (e) => {
      const code = e.target.value;
      const emp = employees.find((x) => normalizeCode(x.code) === normalizeCode(code));

      if (!code || !emp) {
        setForm((prev) => ({
          ...prev,
          employeeCode: "",
          employeeName: "",
          department: "",
          position: "",
        }));
        return;
      }

      setForm((prev) => ({
        ...prev,
        employeeCode: emp.code,
        employeeName: emp.name || "",
        department: emp.department || "",
        position: emp.position || "",
      }));
    },
    [employees, setForm]
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    const payload = {
      employeeCode: form.employeeCode ?? "",
      employeeName: form.employeeName ?? "",
      department: form.department ?? "",
      position: form.position ?? "",
      leaveType: form.leaveType ?? "",
      fromDate: form.fromDate ?? "",
      toDate: form.toDate ?? "",
      reason: form.reason ?? "",
      status: form.status ?? "Chờ duyệt",
    };

    // Guard: create không cho set status khác "Chờ duyệt"
    if (mode === "create") payload.status = "Chờ duyệt";
    // Guard: không có quyền thì edit cũng không cho đổi status
    if (mode === "edit" && !canUpdateStatus) payload.status = safeInitialValues.status || payload.status;

    if (!validate(payload)) return;

    if (!window.confirm(mode === "create" ? "Tạo đơn?" : "Lưu thay đổi?")) return;

    onSubmit?.(payload);
  };

  const disableEmployeeSelect = mode === "edit" || !canUpdateStatus;
  const disableStatusSelect = mode === "create" || !canUpdateStatus;

  return (
    <form className="onleave-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo đơn nghỉ" : "Cập nhật đơn nghỉ"}</h3>

      <div className="form-grid">
        <FormSelect
          label="Nhân viên"
          name="employeeCode"
          value={form.employeeCode}
          onChange={handleEmployeeChange}
          required
          disabled={disableEmployeeSelect || loading}
          error={errors.employeeCode}
        >
          <option value="">{loading ? "Đang tải..." : "-- Chọn --"}</option>
          {employees.map((e) => (
            <option key={e.code} value={e.code}>
              {e.code} - {e.name}
            </option>
          ))}
        </FormSelect>

        <FormInput label="Phòng ban" value={resolve(deptMap, form.department)} disabled />
        <FormInput label="Chức vụ" value={resolve(posMap, form.position)} disabled />

        <FormSelect
          label="Loại nghỉ"
          name="leaveType"
          value={form.leaveType}
          onChange={handleChange}
          required
          error={errors.leaveType}
        >
          <option value="">-- Chọn loại nghỉ --</option>
          <option value="Nghỉ phép">Nghỉ phép</option>
          <option value="Nghỉ không lương">Nghỉ không lương</option>
          <option value="Nghỉ việc">Nghỉ việc</option>
        </FormSelect>

        <FormInput
          type="date"
          label="Từ ngày"
          name="fromDate"
          value={form.fromDate}
          onChange={handleChange}
          required
          error={errors.fromDate}
        />

        <FormInput
          type="date"
          label="Đến ngày"
          name="toDate"
          value={form.toDate}
          onChange={handleChange}
          required
          error={errors.toDate}
        />

        <FormTextarea
          label="Lý do"
          name="reason"
          value={form.reason}
          onChange={handleChange}
          required
          error={errors.reason}
        />

        <FormSelect
          label="Trạng thái"
          name="status"
          value={form.status}
          onChange={handleChange}
          disabled={disableStatusSelect}
          error={errors.status}
        >
          <option value="Chờ duyệt">Chờ duyệt</option>
          {mode === "edit" && (
            <>
              <option value="Đã duyệt">Đã duyệt</option>
              <option value="Từ chối">Từ chối</option>
            </>
          )}
        </FormSelect>
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo đơn" : "Lưu thay đổi"}
      />
    </form>
  );
}
