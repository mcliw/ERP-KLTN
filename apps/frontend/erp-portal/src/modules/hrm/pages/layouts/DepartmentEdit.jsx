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

  useEffect(() => {
    departmentService.getByCode(code).then((data) => {
      setDepartment(data);
      setLoading(false);
    });
  }, [code]);

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  }

  if (!department) {
    return <div style={{ padding: 20 }}>Không tìm thấy phòng ban</div>;
  }

  const handleUpdate = async (data) => {
    const payload = { ...data };

    // khóa code
    delete payload.code;

    await departmentService.update(code, payload);
    navigate(`/hrm/phong-ban/${code}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <DepartmentForm
        mode="edit"
        initialData={department}
        onSubmit={handleUpdate}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
