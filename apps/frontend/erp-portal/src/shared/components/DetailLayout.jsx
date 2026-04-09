import React from "react";
import { FaArrowLeft, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// 1. Header chuẩn cho trang chi tiết
export function DetailHeader({ title, onBack, actions }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div className="profile-header">
      <h2>{title}</h2>
      <div className="profile-actions">
        <button onClick={handleBack}>
          <FaArrowLeft /> <span>Quay lại</span>
        </button>
        {actions}
      </div>
    </div>
  );
}

// 2. Nút chỉnh sửa nhanh (Thường dùng trong actions)
export function EditButton({ onClick, label = "Chỉnh sửa" }) {
  return (
    <button className="btn-primary" onClick={onClick}>
      <FaEdit /> <span>{label}</span>
    </button>
  );
}

// 3. Phần thông tin chính (Top Section - Avatar/Name/Status)
export function DetailTop({ title, subtitle, status, isDeleted, avatarUrl }) {
  const statusClass = 
    status === "Hoạt động" || status === "Đang làm việc" || status === "Đã duyệt" ? "active" :
    status === "Ngưng hoạt động" || status === "Nghỉ việc" || status === "Từ chối" ? "inactive" : "pending";

  return (
    <div className="profile-top">
      {avatarUrl !== undefined && (
        <div className="profile-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="avatar" /> : <div className="profile-avatar-placeholder">Ảnh</div>}
        </div>
      )}
      <div className="profile-main">
        <div className="profile-name">{title}</div>
        <div className="profile-sub">{subtitle}</div>
        {status && <div className={`status-badge ${statusClass}`}>{status}</div>}
        {isDeleted && <div className="deleted-note">Dữ liệu này đã bị xoá</div>}
      </div>
    </div>
  );
}

// 4. Section container
export function DetailSection({ title, children }) {
  return (
    <div className="profile-section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

// 5. Grid container cho các item
export function DetailGrid({ children }) {
  return <div className="profile-grid">{children}</div>;
}

// 6. Item hiển thị thông tin (Label - Value)
export function DetailItem({ label, value, fullWidth = false, color }) {
  return (
    <div className={`profile-item ${fullWidth ? "full-width" : ""}`}>
      <div className="profile-label" style={color ? { color } : {}}>{label}</div>
      <div className="profile-value">{value || "—"}</div>
    </div>
  );
}