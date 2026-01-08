// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/AccountDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { accountService } from "../../services/account.service";
import "../styles/detail.css";
import { FaEdit, FaArrowLeft } from "react-icons/fa";

/* ================= HELPERS ================= */

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

/* ================= COMPONENT ================= */

export default function AccountDetail() {
  const params = useParams();
  const navigate = useNavigate();

  // ✅ Bắt param linh hoạt
  const username = useMemo(() => {
    return (
      params.username ||
      params.id ||
      params.code ||
      params.user ||
      ""
    );
  }, [params]);

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD ================= */

  useEffect(() => {
    if (!username) return;

    let alive = true;
    setLoading(true);

    accountService
      .getByUsername(username)
      .then((data) => {
        if (!alive) return;
        setAccount(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [username]);

  /* ================= GUARDS ================= */

  if (!username) {
    return (
      <div style={{ padding: 20 }}>
        Thiếu thông tin tài khoản
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  if (!account) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy tài khoản
      </div>
    );
  }

  const isDeleted = Boolean(account.deletedAt);
  const emp = account.employee || {};

  /* ================= RENDER ================= */

  return (
    <div className="main-detail">
      {/* HEADER */}
      <div className="profile-header">
        <h2>Chi tiết tài khoản</h2>

        <div className="profile-actions">
          <button onClick={() => navigate("/hrm/tai-khoan")}>
            <FaArrowLeft />
            <span>Quay lại</span>
          </button>

          {!isDeleted && (
            <button
              className="btn-primary"
              onClick={() =>
                navigate(
                  `/hrm/tai-khoan/${account.username}/chinh-sua`
                )
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
            {emp.name || account.username}
          </div>

          <div className="profile-sub">
            {account.username}
          </div>

          <div
            className={`status-badge ${
              account.status === "Hoạt động"
                ? "active"
                : "inactive"
            }`}
          >
            {account.status}
          </div>

          {isDeleted && (
            <div className="deleted-note">
              Tài khoản này đã bị xoá
            </div>
          )}
        </div>
      </div>

      {/* THÔNG TIN TÀI KHOẢN */}
      <div className="profile-section">
        <h3>Thông tin tài khoản</h3>

        <div className="profile-grid">
          <Info label="Tên đăng nhập" value={account.username} />
          <Info label="Họ tên" value={emp.name} />
          <Info label="Email" value={emp.email} />
          <Info label="Vai trò" value={account.role} />
          <Info label="Phòng ban" value={emp.departmentName} />
          <Info label="Chức vụ" value={emp.positionName} />
        </div>
      </div>

      {/* TRẠNG THÁI */}
      <div className="profile-section">
        <h3>Trạng thái</h3>

        <div className="profile-grid">
          <Info
            label="Trạng thái hoạt động"
            value={account.status}
          />
          <Info
            label="Ngày tạo"
            value={formatDate(account.createdAt)}
          />
          <Info
            label="Cập nhật lần cuối"
            value={formatDate(account.updatedAt)}
          />
        </div>
      </div>
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