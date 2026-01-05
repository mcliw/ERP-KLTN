// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/DepartmentCreate.jsx

import { useNavigate } from "react-router-dom";
import DepartmentForm from "../../components/layouts/DepartmentForm";
import { departmentService } from "../../services/department.service";

export default function DepartmentCreate() {
  const navigate = useNavigate();

  const handleCreate = async (data) => {
    const payload = { ...data };

    try {
      await departmentService.create(payload);
      navigate("/hrm/phong-ban");
    } catch (e) {
      if (e.status === 409 && e.field === "code") {
        alert("Mã phòng ban đã tồn tại");
      } else {
        alert("Có lỗi xảy ra khi tạo phòng ban");
      }
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <DepartmentForm
        mode="create"
        onSubmit={handleCreate}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
