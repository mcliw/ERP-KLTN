// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/DepartmentCreate.jsx

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import DepartmentForm from "../../components/layouts/DepartmentForm";
import { departmentService } from "../../services/department.service";

/* =========================
 * Component
 * ========================= */

export default function DepartmentCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  /* =========================
   * Handlers
   * ========================= */

  const handleCreate = async (formData) => {
    if (submitting) return;

    setSubmitting(true);

    const payload = {
      ...formData,
    };

    try {
      await departmentService.create(payload);

      navigate("/hrm/phong-ban");
    } catch (err) {
      if (err?.status === 409 && err?.field === "code") {
        alert("Mã phòng ban đã tồn tại");
      } else if (err?.status === 400) {
        alert(err.message || "Dữ liệu không hợp lệ");
      } else {
        alert("Có lỗi khi tạo phòng ban");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
   * Render
   * ========================= */

  return (
    <div style={{ padding: 20 }}>
      <DepartmentForm
        mode="create"
        onSubmit={handleCreate}
        onCancel={() => navigate(-1)}
        disabled={submitting}
      />
    </div>
  );
}