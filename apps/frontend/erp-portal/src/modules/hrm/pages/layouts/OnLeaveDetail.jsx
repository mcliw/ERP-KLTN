// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/OnLeaveDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onLeaveService } from "../../services/onLeave.service";
import "../styles/detail.css";
import {
  FaArrowLeft,
  FaEdit,
  FaCheck,
  FaTimes,
  FaUndo,
} from "react-icons/fa";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";

/* ================= HELPERS ================= */

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

/* ================= COMPONENT ================= */

export default function OnLeaveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [onLeave, setOnLeave] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = useAuthStore((s) => s.user);

  const canEditOnLeave = hasPermission(
    user?.role,
    HRM_PERMISSIONS.LEAVE_EDIT
  );

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    if (!id) return;

    let alive = true;
    setLoading(true);

    const load = async () => {
      try {
        const item = await onLeaveService.getById(id);
        if (!alive) return;
        setOnLeave(item);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [id]);

  /* ================= GUARDS ================= */

  if (!id) {
    return (
      <div style={{ padding: 20 }}>
        Thiếu thông tin đơn nghỉ
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  if (!onLeave) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy đơn nghỉ
      </div>
    );
  }

  /* ================= DERIVED ================= */

  const isDeleted = Boolean(onLeave.deletedAt);

  const displayDepartment =
    onLeave.departmentName ||
    onLeave.department ||
    "—";

  const displayPosition =
    onLeave.positionName ||
    onLeave.position ||
    "—";

  /* ================= ACTIONS ================= */

  const handleApprove = async () => {
    if (!window.confirm("Duyệt đơn nghỉ này?")) return;
    const approverName = user?.name || user?.id || "Admin";
    try {
      await onLeaveService.approve(id, approverName);
      alert("Đã duyệt đơn thành công!");
      navigate("/hrm/nghi-phep");
    } catch (e) {
      alert("Lỗi: " + e.message);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt("Nhập lý do từ chối phê duyệt:");
    if (reason === null) return;

    if (!reason.trim()) {
      alert("Bạn phải nhập lý do từ chối!");
      return;
    }

    const approverName = user?.name || user?.id || "Admin";

    try {
      setLoading(true);
      await onLeaveService.reject(id, reason, approverName);
      alert("Đã từ chối đơn nghỉ!");
      navigate("/hrm/nghi-phep");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra: " + (error.message || "Không rõ nguyên nhân"));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm("Khôi phục đơn nghỉ này?")) return;
    await onLeaveService.restore(id);
    navigate("/hrm/nghi-phep/khoi-phuc");
  };

  /* ================= RENDER ================= */

  return (
    <div className="main-detail">
      {/* HEADER */}
      <div className="profile-header">
        <h2>Chi tiết đơn nghỉ</h2>

        <div className="profile-actions">
          <button onClick={() => navigate("/hrm/nghi-phep")}>
            <FaArrowLeft />
            <span>Quay lại</span>
          </button>

          {/* ACTIONS WHEN NOT DELETED */}
          {!isDeleted && onLeave.status === "Chờ duyệt" && canEditOnLeave && (
            <>
              <button
                className="btn-primary"
                onClick={() =>
                  navigate(
                    `/hrm/nghi-phep/${id}/chinh-sua`
                  )
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

          {/* RESTORE */}
          {isDeleted && (
            <button
              className="btn-success"
              onClick={handleRestore}
            >
              <FaUndo />
              <span>Khôi phục</span>
            </button>
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

          {isDeleted && (
            <div className="deleted-note">
              Đơn nghỉ này đã bị xoá
            </div>
          )}
        </div>
      </div>

      {/* THÔNG TIN ĐƠN */}
      <div className="profile-section">
        <h3>Thông tin đơn nghỉ</h3>

        <div className="profile-grid">
          <Info label="Loại nghỉ" value={onLeave.leaveType} />
          <Info
            label="Từ ngày"
            value={formatDate(onLeave.fromDate)}
          />
          <Info
            label="Đến ngày"
            value={formatDate(onLeave.toDate)}
          />
          <Info label="Lý do" value={onLeave.reason} />
        </div>
      </div>

      {/* THÔNG TIN NHÂN VIÊN */}
      <div className="profile-section">
        <h3>Thông tin nhân viên</h3>

        <div className="profile-grid">
          <Info
            label="Mã nhân viên"
            value={onLeave.employeeCode}
          />
          <Info
            label="Họ tên"
            value={onLeave.employeeName}
          />
          <Info
            label="Phòng ban"
            value={displayDepartment}
          />
          <Info
            label="Chức vụ"
            value={displayPosition}
          />
        </div>
      </div>

      {/* LỊCH SỬ DUYỆT */}
      {["Đã duyệt", "Từ chối"].includes(onLeave.status) && (
        <div className="profile-section">
          <h3>Lịch sử duyệt</h3>

          <div className="profile-grid">
            <Info
              label="Trạng thái"
              value={onLeave.status}
            />
            <Info
              label={onLeave.status === "Từ chối" ? "Người từ chối" : "Người duyệt"}
              value={onLeave.approvedBy}
            />
            <Info
              label={onLeave.status === "Từ chối" ? "Ngày từ chối" : "Ngày duyệt"}
              value={formatDate(onLeave.approvedAt)}
            />
            {onLeave.status === "Từ chối" && (
                <div className="profile-item full-width">
                    <div className="profile-label" style={{ color: 'red' }}>Lý do từ chối</div>
                    <div className="profile-value">{onLeave.rejectReason || "—"}</div>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SUB ================= */

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