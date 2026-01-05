// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/DepartmentDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { departmentService } from "../../services/department.service";
import "../styles/detail.css";
import { FaEdit, FaArrowLeft } from "react-icons/fa";

export default function DepartmentDetail() {
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

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!department)
    return <div style={{ padding: 20 }}>Không tìm thấy phòng ban</div>;

  return (
    <div className="main-detail">
      {/* HEADER */}
      <div className="profile-header">
        <h2>Chi tiết phòng ban</h2>
        <div className="profile-actions">
          <button onClick={() => navigate("/hrm/phong-ban")}>
            <FaArrowLeft style={{ marginRight: 5 }}/> <span>Quay lại</span>
          </button>

          <button
            className="btn-primary"
            onClick={() =>
              navigate(`/hrm/phong-ban/${code}/chinh-sua`)
            }
          >
            <FaEdit />
            <span>Chỉnh sửa</span>
          </button>
        </div>
      </div>

      {/* TOP */}
      <div className="profile-top">
        <div className="profile-main">
          <div className="profile-name">{department.name}</div>
          <div className="profile-sub">
            {department.code}
          </div>

          <div
            className={`status-badge ${
              department.status === "Hoạt động"
                ? "active"
                : "inactive"
            }`}
          >
            {department.status}
          </div>
        </div>
      </div>

      {/* THÔNG TIN CHUNG */}
      <div className="profile-section">
        <h3>Thông tin phòng ban chung</h3>
        <div className="profile-grid">
          <Info label="Mã phòng ban" value={department.code} />
          <Info label="Tên phòng ban" value={department.name} />
          <Info label="Trưởng phòng" value={department.manager} />
          <Info
            label="Số lượng nhân viên"
            value={department.employeeCount}
          />
        </div>
      </div>

      {/* TRẠNG THÁI */}
      <div className="profile-section">
        <h3>Trạng thái</h3>
        <div className="profile-grid">
          <Info label="Trạng thái hoạt động" value={department.status} />
          <Info label="Ngày tạo" value={department.createdAt} />
        </div>
      </div>
    </div>
  );
}

/* Component hiển thị 1 dòng info */
function Info({ label, value }) {
  return (
    <div className="profile-item">
      <div className="profile-label">{label}</div>
      <div className="profile-value">{value || "—"}</div>
    </div>
  );
}