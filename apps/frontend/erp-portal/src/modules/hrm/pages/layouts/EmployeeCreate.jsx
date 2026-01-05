// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/EmployeeCreate.jsx

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import EmployeeForm from "../../components/layouts/EmployeeForm";
import { employeeService } from "../../services/employee.service";

/* =========================
 * Component
 * ========================= */

export default function EmployeeCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  /* =========================
   * Handlers
   * ========================= */

  const handleCreate = async (formData) => {
    if (submitting) return;

    setSubmitting(true);

    // payload đúng chuẩn service
    const payload = {
      ...formData,
      avatar: undefined,
      avatarPreview: undefined,
    };

    try {
      const created = await employeeService.create(payload);

      // 👉 sau này có thể navigate sang profile
      // navigate(`/hrm/ho-so-nhan-vien/${created.code}`);

      navigate("/hrm/ho-so-nhan-vien");
    } catch (err) {
      if (err?.status === 409 && err?.field === "code") {
        alert("Mã nhân viên đã tồn tại");
      } else if (err?.status === 400) {
        alert(err.message || "Dữ liệu không hợp lệ");
      } else {
        alert("Có lỗi khi tạo hồ sơ nhân viên");
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
      <EmployeeForm
        mode="create"
        onSubmit={handleCreate}
        onCancel={() => navigate(-1)}
        disabled={submitting}
      />
    </div>
  );
}