// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/DepartmentDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { departmentService } from "../../services/department.service";
import { employeeService } from "../../services/employee.service";
import { positionService } from "../../services/position.service";
import "../styles/detail.css";
import "../../../../shared/styles/button.css";
import { FaEdit, FaArrowLeft } from "react-icons/fa";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";

/* =========================
 * Helpers
 * ========================= */

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

/* =========================
 * Component
 * ========================= */

export default function DepartmentDetail() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [positionMap, setPositionMap] = useState({});
  const [loading, setLoading] = useState(true);

  const user = useAuthStore((s) => s.user);

  const canEditDepartment = hasPermission(
    user?.role,
    HRM_PERMISSIONS.DEPARTMENT_EDIT
  );

  /* =========================
   * Load department + employees
   * ========================= */

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const dept = await departmentService.getByCode(code);
        if (!alive) return;
        setDepartment(dept);

        // Load positions
        const positions = await positionService.getAll();
        if (!alive) return;

        const map = {};
        positions.forEach((p) => {
          map[p.code] = p.name;
        });
        setPositionMap(map);

        // Load employees
        if (dept) {
          const list = await employeeService.getAll();
          if (!alive) return;

          const deptEmployees = list.filter(
            (e) =>
              !e.deletedAt &&
              e.status === "Đang làm việc" &&
              e.department === dept.code
          );

          setEmployees(deptEmployees);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadData();
    return () => {
      alive = false;
    };
  }, [code]);

  /* =========================
   * Render guards
   * ========================= */

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  if (!department) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy phòng ban
      </div>
    );
  }

  const isDeleted = Boolean(department.deletedAt);

  /* =========================
   * Render
   * ========================= */

  return (
    <div className="main-detail">
      {/* HEADER */}
      <div className="profile-header">
        <h2>Chi tiết phòng ban</h2>

        <div className="profile-actions">
          <button onClick={() => navigate("/hrm/phong-ban")}>
            <FaArrowLeft />
            <span>Quay lại</span>
          </button>

          {!isDeleted && canEditDepartment && (
            <button
              className="btn-primary"
              onClick={() =>
                navigate(`/hrm/phong-ban/${code}/chinh-sua`)
              }
            >
              <FaEdit />
              <span>Chỉnh sửa</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP */}
      <div className="profile-top">
        <div className="profile-main">
          <div className="profile-name">
            {department.name}
          </div>

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

          {isDeleted && (
            <div className="deleted-note">
              Phòng ban này đã bị xoá
            </div>
          )}
        </div>
      </div>

      {/* THÔNG TIN CHUNG */}
      <Section title="Thông tin phòng ban">
        <Info label="Mã phòng ban" value={department.code} />
        <Info label="Tên phòng ban" value={department.name} />
        <Info
          label="Trưởng phòng"
          value={department.managerName}
        />
        <Info
          label="Mô tả"
          value={department.description}
        />
        <Info
          label="Số lượng nhân viên"
          value={department.employeeCount}
        />
      </Section>

      {/* DANH SÁCH NHÂN VIÊN */}
      <Section title="Nhân viên thuộc phòng ban">
        {employees.length === 0 ? (
          <div style={{ padding: "8px 0" }}>
            Không có nhân viên đang làm việc
          </div>
        ) : (
          <table className="main-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ tên</th>
                <th>Chức vụ</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr
                  // key={e.code}
                  // className="clickable"
                  // onClick={() =>
                  //   navigate(
                  //     `/hrm/ho-so-nhan-vien/${e.code}`
                  //   )
                  // }
                >
                  <td>{e.code}</td>
                  <td>{e.name}</td>
                  <td>
                    {positionMap[e.position] === "Trưởng phòng"
                      ? <strong>{positionMap[e.position]}</strong>
                      : positionMap[e.position] || "—"}
                  </td>
                  <td>{e.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* TRẠNG THÁI */}
      <Section title="Trạng thái">
        <Info
          label="Trạng thái hoạt động"
          value={department.status}
        />
        <Info
          label="Ngày tạo"
          value={formatDate(department.createdAt)}
        />
        <Info
          label="Cập nhật lần cuối"
          value={formatDate(department.updatedAt)}
        />
      </Section>
    </div>
  );
}

/* =========================
 * Sub components
 * ========================= */

function Section({ title, children }) {
  return (
    <div className="profile-section">
      <h3>{title}</h3>
      <div className="profile-grid">{children}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="profile-item">
      <div className="profile-label">{label}</div>
      <div className="profile-value">
        {value || "—"}
      </div>
    </div>
  );
}