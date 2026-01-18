// apps/frontend/erp-portal/src/modules/hrm/components/layouts/PositionForm.jsx

import { useMemo, useEffect, useState } from "react";
import {
  positionCreateSchema,
  positionUpdateSchema,
  POSITION_NAME_OPTIONS,
} from "../../validations/position.schema";
import {
  useFormManager,
  FormInput,
  FormSelect,
  FormTextarea,
  FormActions,
} from "../../../../shared/components/FormCommon";
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

const DEFAULT_FORM = {
  code: "",
  name: "",
  department: "",
  capacity: 1,
  status: "Hoạt động",
  description: "",
};

/* ==============================
 * Main Component
 * ============================== */
export default function PositionForm({
  mode = "create",
  initialData,
  hasAssignees = false,
  onSubmit,
  onCancel,
}) {
  const toast = useToast();
  const [infoMessage, setInfoMessage] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return { ...DEFAULT_FORM, ...cleaned };
  }, [initialData]);

  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: mode === "create" ? positionCreateSchema : positionUpdateSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({ ...prev, ...cleanData(initialData) }));
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
    return () => {
      mounted = false;
    };
  }, []);

  // Clear info when relevant fields change
  useEffect(() => {
    if (infoMessage) setInfoMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.department, form.capacity, form.status, form.description]);

  // Guard Status: Không cho "Ngưng hoạt động" nếu còn nhân viên đảm nhận
  useEffect(() => {
    if (mode !== "edit") return;

    if (form.status === "Ngưng hoạt động" && hasAssignees) {
      setInfoMessage("Không thể ngưng hoạt động chức vụ khi đang có nhân viên đảm nhận.");
      setForm((prev) => ({ ...prev, status: "Hoạt động" }));
    }
  }, [form.status, hasAssignees, mode, setForm]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    const currentAssigneeCount =
      typeof initialData?.assigneeCount === "number" ? initialData.assigneeCount : 0;

    const capacityNumber = Number(form.capacity);

    // Guard: nếu đang có người đảm nhận thì không cho giảm capacity < số hiện có
    if (hasAssignees && Number.isFinite(capacityNumber) && capacityNumber < currentAssigneeCount) {
      setInfoMessage("Số lượng không được nhỏ hơn nhân viên hiện có.");
      return;
    }

    const payload = {
      code: form.code ?? "",
      name: form.name ?? "",
      department: form.department ?? "",
      capacity: capacityNumber,
      status: form.status ?? "Hoạt động",
      description: form.description ?? "",
    };

    // Theo pattern của bạn: edit thì bỏ code
    const submitData = mode === "edit" ? (({ code, ...rest }) => rest)(payload) : payload;

    if (!validate(submitData)) return;

    if (!window.confirm(mode === "create" ? "Tạo chức vụ?" : "Lưu thay đổi?")) return;

    onSubmit?.(submitData);
  };

  const disableBaseFields = mode === "edit" && hasAssignees;

  return (
    <form className="position-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo chức vụ" : "Cập nhật chức vụ"}</h3>

      <div className="form-grid">
        <FormInput
          label="Mã chức vụ"
          name="code"
          value={form.code}
          onChange={handleChange}
          required
          disabled={mode === "edit"}
          error={errors.code}
        />

        <FormSelect
          label="Chức vụ"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          disabled={disableBaseFields}
          error={errors.name}
        >
          <option value="">-- Chọn chức vụ --</option>
          {POSITION_NAME_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </FormSelect>

        <FormSelect
          label="Phòng ban"
          name="department"
          value={form.department}
          onChange={handleChange}
          required
          disabled={disableBaseFields || loadingDepts}
          error={errors.department}
        >
          <option value="">-- Chọn phòng ban --</option>
          {departments.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </FormSelect>

        <FormInput
          type="number"
          label="Số lượng tối đa"
          name="capacity"
          value={form.capacity}
          onChange={handleChange}
          required
          min={1}
          error={errors.capacity}
        />

        <FormSelect
          label="Trạng thái"
          name="status"
          value={form.status}
          onChange={handleChange}
          disabled={mode === "edit" && hasAssignees}
          error={errors.status}
        >
          <option value="Hoạt động">Hoạt động</option>
          {mode === "edit" && <option value="Ngưng hoạt động">Ngưng hoạt động</option>}
        </FormSelect>

        <FormTextarea
          label="Mô tả"
          name="description"
          value={form.description}
          onChange={handleChange}
          error={errors.description}
        />
      </div>

      {infoMessage && <div className="info-message">{infoMessage}</div>}

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo chức vụ" : "Lưu thay đổi"}
      />
    </form>
  );
}
