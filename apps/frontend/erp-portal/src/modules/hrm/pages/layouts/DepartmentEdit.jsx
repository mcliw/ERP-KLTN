// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/DepartmentEdit.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DepartmentForm from "../../components/layouts/DepartmentForm";
import { departmentService } from "../../services/department.service";

export default function DepartmentEdit() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* =========================
   * Load department
   * ========================= */

  useEffect(() => {
    let alive = true;

    const loadDepartment = async () => {
      setLoading(true);
      try {
        const data = await departmentService.getByCode(code);
        if (!alive) return;
        setDepartment(data);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadDepartment();
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

  if (!department) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy phòng ban
      </div>
    );
  }

  if (department.deletedAt) {
    return (
      <div style={{ padding: 20 }}>
        Phòng ban đã bị xoá, không thể chỉnh sửa
      </div>
    );
  }

  /* =========================
   * Handlers
   * ========================= */

  const handleUpdate = async (formData) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      await departmentService.update(code, {
        ...formData,
        code: undefined, // 🔒 khóa mã
      });

      navigate(`/hrm/phong-ban/${code}`);
    } catch (err) {
      if (err?.status === 404) {
        alert("Không tìm thấy phòng ban");
      } else if (err?.field) {
        alert(err.message);
      } else {
        alert("Có lỗi khi cập nhật phòng ban");
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
        mode="edit"
        initialData={department}
        employeeCount={department.employeeCount ?? 0}
        onSubmit={handleUpdate}
        onCancel={() => navigate(-1)}
        disabled={submitting}
      />
    </div>
  );
}