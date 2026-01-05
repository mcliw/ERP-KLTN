// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/ContractDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { contractService } from "../../services/contract.service";
import "../styles/detail.css";
import "../../../../shared/styles/button.css";
import { FaEdit, FaArrowLeft } from "react-icons/fa";

/* =========================
 * Helpers
 * ========================= */

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

const formatMoney = (v) =>
  typeof v === "number"
    ? v.toLocaleString("vi-VN")
    : "—";

/* =========================
 * Component
 * ========================= */

export default function ContractDetail() {
  const { contractCode } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
   * Load contract
   * ========================= */

  useEffect(() => {
    let alive = true;

    const loadContract = async () => {
      setLoading(true);
      try {
        const data = await contractService.getByCode(
          contractCode
        );
        if (!alive) return;
        setContract(data);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadContract();
    return () => {
      alive = false;
    };
  }, [contractCode]);

  /* =========================
   * Render guards
   * ========================= */

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  if (!contract) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy hợp đồng
      </div>
    );
  }

  const emp = contract.employee;
  const isDeleted = Boolean(contract.deletedAt);

  /* =========================
   * Render
   * ========================= */

  return (
    <div className="main-detail">
      {/* HEADER */}
      <div className="profile-header">
        <h2>Chi tiết hợp đồng</h2>

        <div className="profile-actions">
          <button
            onClick={() =>
              navigate("/hrm/hop-dong-lao-dong")
            }
          >
            <FaArrowLeft />
            <span>Quay lại</span>
          </button>

          {!isDeleted && (
            <button
              className="btn-primary"
              onClick={() =>
                navigate(
                  `/hrm/hop-dong-lao-dong/${contract.contractCode}/chinh-sua`
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
            Hợp đồng {contract.contractCode}
          </div>

          <div className="profile-sub">
            {emp
              ? `${emp.code} • ${emp.name}`
              : contract.employeeCode}
          </div>

          <div
            className={`status-badge ${
              contract.status === "Hiệu lực"
                ? "active"
                : "inactive"
            }`}
          >
            {contract.status}
          </div>

          {isDeleted && (
            <div className="deleted-note">
              Hợp đồng này đã bị huỷ / xoá
            </div>
          )}
        </div>
      </div>

      {/* THÔNG TIN HỢP ĐỒNG */}
      <Section title="Thông tin hợp đồng">
        <Info
          label="Mã hợp đồng"
          value={contract.contractCode}
        />
        <Info
          label="Loại hợp đồng"
          value={contract.contractType}
        />
        <Info
          label="Ngày bắt đầu"
          value={formatDate(contract.startDate)}
        />
        <Info
          label="Ngày kết thúc"
          value={formatDate(contract.endDate)}
        />
        <Info label="Trạng thái" value={contract.status} />
      </Section>

      {/* THÔNG TIN NHÂN VIÊN */}
      <Section title="Thông tin nhân viên">
        <Info label="Mã nhân viên" value={emp?.code} />
        <Info label="Họ tên" value={emp?.name} />
        <Info label="Email" value={emp?.email} />
        <Info
          label="Phòng ban"
          value={emp?.departmentName}
        />
        <Info
          label="Chức vụ"
          value={emp?.positionName}
        />
      </Section>

      {/* TÀI CHÍNH */}
      <Section title="Thông tin tài chính">
        <Info
          label="Lương cơ bản"
          value={formatMoney(contract.salary)}
        />
        <Info
          label="Ngày tạo"
          value={formatDate(contract.createdAt)}
        />
        <Info
          label="Cập nhật lần cuối"
          value={formatDate(contract.updatedAt)}
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
