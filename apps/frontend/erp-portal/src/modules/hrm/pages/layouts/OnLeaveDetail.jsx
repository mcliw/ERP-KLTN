// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/OnLeaveDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onLeaveService } from "../../services/onLeave.service";
import { departmentService } from "../../services/department.service";
import { positionService } from "../../services/position.service";
import "../styles/detail.css";
import {
  FaArrowLeft,
  FaEdit,
  FaCheck,
  FaTimes,
} from "react-icons/fa";

export default function OnLeaveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [onLeave, setOnLeave] = useState(null);
  const [departmentName, setDepartmentName] = useState("");
  const [positionName, setPositionName] = useState("");
  const [loading, setLoading] = useState(true);

  /* -------------------- LOAD DATA -------------------- */
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);

        const item = await onLeaveService.getById(id);
        if (!alive) return;

        setOnLeave(item);

        // PHÒNG BAN
        if (item?.department) {
          const d = await departmentService.getByCode(item.department);
          if (!alive) return;
          setDepartmentName(d?.name || "");
        }

        // CHỨC VỤ
        if (item?.position) {
          const p = await positionService.getByCode(item.position);
          if (!alive) return;
          setPositionName(p?.name || "");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading)
    return <div style={{ padding: 20 }}>Đang tải...</div>;

  if (!onLeave)
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy đơn nghỉ
      </div>
    );

  const displayDepartment =
    departmentName || onLeave.department || "—";
  const displayPosition =
    positionName || onLeave.position || "—";

  /* -------------------- ACTIONS -------------------- */
  const handleApprove = async () => {
    if (!window.confirm("Duyệt đơn nghỉ này?")) return;
    await onLeaveService.approve(id);
    navigate("/hrm/nghi-phep");
  };

  const handleReject = async () => {
    if (!window.confirm("Từ chối đơn nghỉ này?")) return;
    await onLeaveService.reject(id);
    navigate("/hrm/nghi-phep");
  };

  return (
    <div className="main-detail">
      {/* HEADER */}
      <div className="profile-header">
        <h2>Chi tiết đơn nghỉ</h2>

        <div className="profile-actions">
          <button onClick={() => navigate("/hrm/nghi-phep")}>
            <FaArrowLeft style={{ marginRight: 5 }} />
            <span>Quay lại</span>
          </button>

          {onLeave.status === "Chờ duyệt" && (
            <>
              <button
                className="btn-primary"
                onClick={() =>
                  navigate(`/hrm/nghi-phep/${id}/chinh-sua`)
                }
              >
                <FaEdit />
                <span>Chỉnh sửa</span>
              </button>

              <button
                className="btn-success"
                onClick={handleApprove}
              >
                <FaCheck />
                <span>Duyệt</span>
              </button>

              <button
                className="btn-danger"
                onClick={handleReject}
              >
                <FaTimes />
                <span>Từ chối</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TOP */}
      <div className="profile-top">
        <div className="profile-main">
          <div className="profile-name">
            {onLeave.employeeName}
          </div>
          <div className="profile-sub">
            {onLeave.employeeCode} • {displayDepartment} •{" "}
            {displayPosition}
          </div>

          <div
            className={`status-badge ${
              onLeave.status === "Đã duyệt"
                ? "active"
                : onLeave.status === "Từ chối"
                ? "inactive"
                : "pending"
            }`}
          >
            {onLeave.status}
          </div>
        </div>
      </div>

      {/* THÔNG TIN ĐƠN */}
      <div className="profile-section">
        <h3>Thông tin đơn nghỉ</h3>
        <div className="profile-grid">
          <Info label="Loại nghỉ" value={onLeave.leaveType} />
          <Info label="Từ ngày" value={onLeave.fromDate} />
          <Info label="Đến ngày" value={onLeave.toDate} />
          <Info label="Lý do" value={onLeave.reason} />
        </div>
      </div>

      {/* THÔNG TIN NHÂN VIÊN */}
      <div className="profile-section">
        <h3>Thông tin nhân viên</h3>
        <div className="profile-grid">
          <Info label="Mã nhân viên" value={onLeave.employeeCode} />
          <Info label="Họ tên" value={onLeave.employeeName} />
          <Info label="Phòng ban" value={displayDepartment} />
          <Info label="Chức vụ" value={displayPosition} />
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
