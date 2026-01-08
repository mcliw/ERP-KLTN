// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/PositionDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { positionService } from "../../services/position.service";
import "../styles/detail.css";
import "../../../../shared/styles/button.css";
import { FaEdit, FaArrowLeft } from "react-icons/fa";
import { useLookupMaps } from "../../hooks/useLookupMaps";
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

export default function PositionDetail() {
  const { code } = useParams();
  const navigate = useNavigate();

  const { departmentMap } = useLookupMaps();

  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = useAuthStore((s) => s.user);

  const canEditPosition = hasPermission(
    user?.role,
    HRM_PERMISSIONS.POSITION_EDIT
  );

  /* =========================
   * Load position
   * ========================= */

  useEffect(() => {
    let alive = true;

    const loadPosition = async () => {
      setLoading(true);
      try {
        const data = await positionService.getByCode(code);
        if (!alive) return;
        setPosition(data);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadPosition();
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

  if (!position) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy chức vụ
      </div>
    );
  }

  const isDeleted = Boolean(position.deletedAt);

  const assignedCount =
    typeof position.assigneeCount === "number"
      ? position.assigneeCount
      : position.assignees?.length ?? 0;

  const capacity = position.capacity ?? 1;

  /* =========================
   * Render
   * ========================= */

  return (
    <div className="main-detail">
      {/* HEADER */}
      <div className="profile-header">
        <h2>Chi tiết chức vụ</h2>

        <div className="profile-actions">
          <button onClick={() => navigate("/hrm/chuc-vu")}>
            <FaArrowLeft />
            <span>Quay lại</span>
          </button>

          {!isDeleted && canEditPosition && (
            <button
              className="btn-primary"
              onClick={() =>
                navigate(
                  `/hrm/chuc-vu/${code}/chinh-sua`
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
            {position.name}
          </div>

          <div className="profile-sub">
            {position.code} • {position.department || "—"}
          </div>

          <div
            className={`status-badge ${
              position.status === "Hoạt động"
                ? "active"
                : "inactive"
            }`}
          >
            {position.status}
          </div>

          {isDeleted && (
            <div className="deleted-note">
              Chức vụ này đã bị xoá
            </div>
          )}
        </div>
      </div>

      {/* THÔNG TIN CHỨC VỤ */}
      <Section title="Thông tin chức vụ">
        <Info label="Mã chức vụ" value={position.code} />
        <Info label="Tên chức vụ" value={position.name} />
        <Info label="Phòng ban" value={departmentMap[position.department]}/>
        <Info label="Số người đảm nhận" value={`${assignedCount} / ${capacity}`}/>
        <Info label="Mô tả" value={position.description} />

        <div className="profile-item">
          <div className="profile-label">
            Người đảm nhận
          </div>
          <div className="profile-value">
            {position.assignees?.length ? (
              <ul>
                {position.assignees.map((e) => (
                  <li key={e.code}>{e.name}</li>
                ))}
              </ul>
            ) : (
              "—"
            )}
          </div>
        </div>
      </Section>

      {/* TRẠNG THÁI */}
      <Section title="Trạng thái">
        <Info
          label="Trạng thái hoạt động"
          value={position.status}
        />
        <Info
          label="Ngày tạo"
          value={formatDate(position.createdAt)}
        />
        <Info
          label="Cập nhật lần cuối"
          value={formatDate(position.updatedAt)}
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
      <div className="profile-grid">
        {children}
      </div>
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