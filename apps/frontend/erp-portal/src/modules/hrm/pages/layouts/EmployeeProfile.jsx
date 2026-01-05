// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/EmployeeProfile.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { employeeService } from "../../services/employee.service";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import "../styles/detail.css";
import "../../../../shared/styles/button.css";
import { FaUserEdit, FaArrowLeft } from "react-icons/fa";

/* =========================
 * Helpers
 * ========================= */

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

export default function EmployeeProfile() {
  const { code } = useParams();
  const navigate = useNavigate();

  const { departmentMap, positionMap } = useLookupMaps();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
   * Load employee
   * ========================= */

  useEffect(() => {
    let alive = true;

    const loadEmployee = async () => {
      setLoading(true);
      try {
        const emp = await employeeService.getByCode(code);
        if (!alive) return;
        setEmployee(emp);
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
   * Render guards
   * ========================= */

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  if (!employee) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy nhân viên
      </div>
    );
  }

  const departmentName =
    departmentMap[employee.department] ||
    employee.department ||
    "—";

  const positionName =
    positionMap[employee.position] ||
    employee.position ||
    "—";

  const missingAssignment =
    employee.status === "Đang làm việc" &&
    (!employee.department || !employee.position);

  const isDeleted = Boolean(employee.deletedAt);

  /* =========================
   * Render
   * ========================= */

  return (
    <div className="main-detail">
      {/* HEADER */}
      <div className="profile-header">
        <h2>Hồ sơ nhân viên</h2>

        <div className="profile-actions">
          <button onClick={() => navigate("/hrm/ho-so-nhan-vien")}>
            <FaArrowLeft />
            <span>Quay lại</span>
          </button>

          {!isDeleted && (
            <button
              className="btn-primary"
              onClick={() =>
                navigate(
                  `/hrm/ho-so-nhan-vien/${code}/chinh-sua`
                )
              }
            >
              <FaUserEdit />
              <span>Chỉnh sửa</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP */}
      <div className="profile-top">
        <div className="profile-avatar">
          {employee.avatarUrl ? (
            <img src={employee.avatarUrl} alt="avatar" />
          ) : (
            <div className="profile-avatar-placeholder">
              Ảnh
            </div>
          )}
        </div>

        <div className="profile-main">
          <div className="profile-name">{employee.name}</div>

          <div className="profile-sub">
            {employee.code} • {departmentName} •{" "}
            {positionName}
          </div>

          <div
            className={`status-badge ${
              employee.status === "Đang làm việc"
                ? "active"
                : "inactive"
            }`}
          >
            {employee.status}
          </div>

          {isDeleted && (
            <div className="deleted-note">
              Hồ sơ này đã bị xoá
            </div>
          )}
        </div>
      </div>

      {missingAssignment && (
        <div className="warning-banner">
          <strong>⚠ Nhân viên chưa được phân công</strong>
          <div>
            Hồ sơ đang ở trạng thái <b>Đang làm việc</b> nhưng
            chưa có{" "}
            {!employee.department && <b>phòng ban</b>}
            {!employee.department && !employee.position && " và "}
            {!employee.position && <b>chức vụ</b>}.
          </div>

          <button
            className="btn-warning"
            onClick={() =>
              navigate(
                `/hrm/ho-so-nhan-vien/${employee.code}/chinh-sua`
              )
            }
          >
            Phân công ngay
          </button>
        </div>
      )}

      {/* THÔNG TIN CÁ NHÂN */}
      <Section title="Thông tin cá nhân">
        <Info label="Mã nhân viên" value={employee.code} />
        <Info label="Họ tên" value={employee.name} />
        <Info label="Giới tính" value={employee.gender} />
        <Info
          label="Ngày sinh"
          value={formatDate(employee.dob)}
        />
        <Info label="Quê quán" value={employee.hometown} />
        <Info label="Số CCCD" value={employee.cccd} />
      </Section>

      {/* LIÊN HỆ */}
      <Section title="Thông tin liên hệ">
        <Info label="Email" value={employee.email} />
        <Info label="Số điện thoại" value={employee.phone} />
      </Section>

      {/* CÔNG VIỆC */}
      <Section title="Thông tin công việc">
        <Info label="Phòng ban" value={departmentName} />
        <Info label="Chức vụ" value={positionName} />
        <Info
          label="Ngày vào làm"
          value={formatDate(employee.joinDate)}
        />
        <Info label="Trạng thái" value={employee.status} />
        <Info
          label="Ngày nghỉ việc"
          value={
            employee.resignedAt
              ? formatDate(employee.resignedAt)
              : "—"
          }
        />
      </Section>

      {/* TÀI CHÍNH */}
      <Section title="Thông tin tài chính">
        <Info
          label="Tên tài khoản ngân hàng"
          value={employee.bankAccountName}
        />
        <Info
          label="Số tài khoản ngân hàng"
          value={employee.bankAccount}
        />
      </Section>

      {/* HỒ SƠ GIẤY TỜ */}
      <Section title="Hồ sơ giấy tờ">
        <DocumentItem
          label="CV"
          url={employee.cvUrl}
        />

        <DocumentItem
          label="Giấy khám sức khỏe"
          url={employee.healthCertUrl}
        />

        <DocumentItem
          label="Bằng cấp / Chứng chỉ"
          url={employee.degreeUrl}
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
      <div className="profile-value">{value || "—"}</div>
    </div>
  );
}

function DocumentItem({ label, url }) {
  const [open, setOpen] = useState(false);

  if (!url) {
    return (
      <div className="profile-item">
        <div className="profile-label">{label}</div>
        <div className="profile-value">—</div>
      </div>
    );
  }

  return (
    <div className="profile-item full-width">
      <div className="profile-label">{label}</div>

      <div className="profile-value">
        <button
          className="btn-link"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Ẩn PDF" : "Xem PDF"}
        </button>

        {open && (
          <div className="pdf-preview">
            <iframe
              src={url}
              title={label}
              width="100%"
              height="500px"
            />
          </div>
        )}
      </div>
    </div>
  );
}