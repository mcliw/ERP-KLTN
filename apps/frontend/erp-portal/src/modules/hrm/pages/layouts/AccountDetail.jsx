// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/AccountDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { accountService } from "../../services/account.service";
import "../styles/detail.css";
import { FaEdit, FaArrowLeft } from "react-icons/fa";

export default function AccountDetail() {
  const params = useParams();
  const navigate = useNavigate();

  // ✅ Bắt param linh hoạt (tránh mismatch tên param trong Router)
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

  useEffect(() => {
    if (!username) return;

    setLoading(true);
    accountService.getByUsername(username).then((data) => {
      setAccount(data);
      setLoading(false);
    });
  }, [username]);

  if (!username) {
    return <div style={{ padding: 20 }}>Thiếu thông tin tài khoản</div>;
  }

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!account) return <div style={{ padding: 20 }}>Không tìm thấy tài khoản</div>;

  const emp = account.employee || {};

  return (
    <div className="main-detail">
      {/* HEADER */}
      <div className="profile-header">
        <h2>Chi tiết tài khoản</h2>
        <div className="profile-actions">
          <button onClick={() => navigate("/hrm/tai-khoan")}>
            <FaArrowLeft style={{ marginRight: 5 }}/> <span>Quay lại</span>
          </button>

          <button
            className="btn-primary"
            onClick={() =>
              navigate(`/hrm/tai-khoan/${account.username}/chinh-sua`)
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
          <div className="profile-name">{emp.name || account.username}</div>
          <div className="profile-sub">{account.username}</div>

          <div
            className={`status-badge ${
              account.status === "Hoạt động" ? "active" : "inactive"
            }`}
          >
            {account.status}
          </div>
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
          <Info label="Trạng thái hoạt động" value={account.status} />
          <Info label="Ngày tạo" value={account.createdAt} />
        </div>
      </div>
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
