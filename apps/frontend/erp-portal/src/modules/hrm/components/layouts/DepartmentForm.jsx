// apps/frontend/erp-portal/src/modules/hrm/components/layouts/DepartmentForm.jsx

import { useMemo, useEffect, useState } from "react";
import {
  departmentCreateSchema,
  departmentUpdateSchema,
} from "../../validations/department.schema";
import {
  useFormManager,
  FormInput,
  FormSelect,
  FormTextarea,
  FormActions,
} from "../../../../shared/components/FormCommon";
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
  description: "",
  status: "Hoạt động",
};

/* ==============================
 * Main Component
 * ============================== */
export default function DepartmentForm({
  mode = "create",
  initialData,
  employeeCount = 0,
  onSubmit,
  onCancel,
}) {
  const toast = useToast();
  const [infoMessage, setInfoMessage] = useState("");

  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return { ...DEFAULT_FORM, ...cleaned };
  }, [initialData]);

  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: mode === "create" ? departmentCreateSchema : departmentUpdateSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({ ...prev, ...cleanData(initialData) }));
    }
  }, [initialData, setForm]);

  // Guard Status: Không cho "Ngưng hoạt động" nếu còn nhân viên
  useEffect(() => {
    if (mode !== "edit") return;

    if (form.status === "Ngưng hoạt động" && employeeCount > 0) {
      setInfoMessage("Không thể ngưng hoạt động phòng ban khi vẫn còn nhân viên.");
      setForm((prev) => ({ ...prev, status: "Hoạt động" }));
    } else {
      setInfoMessage("");
    }
  }, [form.status, employeeCount, mode, setForm]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    // Department: giữ nguyên payload (kể cả code) cho cả create/edit
    const submitData = {
      code: form.code ?? "",
      name: form.name ?? "",
      description: form.description ?? "",
      status: form.status ?? "Hoạt động",
    };

    if (!validate(submitData)) return;

    if (!window.confirm(mode === "create" ? "Tạo phòng ban?" : "Lưu thay đổi?"))
      return;

    onSubmit?.(submitData);
  };

  const disableWhenInactive = mode === "edit" && form.status === "Ngưng hoạt động";

  return (
    <form className="department-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo phòng ban" : "Cập nhật phòng ban"}</h3>

      <div className="form-grid">
        <FormInput
          label="Mã phòng ban"
          name="code"
          value={form.code}
          onChange={handleChange}
          required
          disabled={mode === "edit"}
          error={errors.code}
        />

        <FormInput
          label="Tên phòng ban"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          disabled={disableWhenInactive}
          error={errors.name}
        />

        <FormSelect
          label="Trạng thái"
          name="status"
          value={form.status}
          onChange={handleChange}
          disabled={mode === "edit" && employeeCount > 0} // chặn đổi status nếu còn NV
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
          disabled={disableWhenInactive}
          error={errors.description}
        />
      </div>

      {infoMessage && <div className="info-message">{infoMessage}</div>}

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo phòng ban" : "Lưu thay đổi"}
      />
    </form>
  );
}
