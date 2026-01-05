// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/EmployeeEdit.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EmployeeForm from "../../components/layouts/EmployeeForm";
import { employeeService } from "../../services/employee.service";

/* =========================
 * Component
 * ========================= */

export default function EmployeeEdit() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* =========================
   * Load employee
   * ========================= */

  useEffect(() => {
    let alive = true;

    const loadEmployee = async () => {
      setLoading(true);
      try {
        const data = await employeeService.getByCode(code);
        if (!alive) return;
        setEmployee(data);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadEmployee();
    return () => {
      alive = false;
    };
  }, [code]);

  /* =========================
   * Guards
   * ========================= */

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  }

  if (!employee) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy nhân viên
      </div>
    );
  }

  if (employee.deletedAt) {
    return (
      <div style={{ padding: 20 }}>
        Hồ sơ nhân viên đã bị xoá, không thể chỉnh sửa
      </div>
    );
  }

  /* =========================
   * Handlers
   * ========================= */

  const handleUpdate = async (formData) => {
    if (submitting) return;
    setSubmitting(true);

    const payload = {
      ...formData,
      avatar: undefined,
      avatarPreview: undefined,
      code: undefined, // khoá mã
    };

    try {
      await employeeService.update(code, payload);
      navigate(`/hrm/ho-so-nhan-vien/${code}`);
    } catch (err) {
      if (err?.status === 404) {
        alert("Không tìm thấy nhân viên");
      } else if (err?.status === 400) {
        alert(err.message || "Dữ liệu không hợp lệ");
      } else {
        alert("Có lỗi khi cập nhật hồ sơ nhân viên");
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
        mode="edit"
        initialData={employee}
        onSubmit={handleUpdate}
        onCancel={() => navigate(-1)}
        disabled={submitting}
      />
    </div>
  );
}