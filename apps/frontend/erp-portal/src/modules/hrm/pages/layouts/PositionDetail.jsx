import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { positionService } from "../../services/position.service";
import { departmentService } from "../../services/department.service";
import "../styles/detail.css";
import { FaEdit, FaArrowLeft } from "react-icons/fa";

export default function PositionDetail() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [position, setPosition] = useState(null);
  const [departmentName, setDepartmentName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);

        const data = await positionService.getByCode(code);
        if (!alive) return;

        setPosition(data);

        const deptCode = data?.department;
        if (deptCode) {
          const dept = await departmentService.getByCode(deptCode);
          if (!alive) return;
          setDepartmentName(dept?.name || "");
        } else {
          setDepartmentName("");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [code]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!position) return <div style={{ padding: 20 }}>Không tìm thấy chức vụ</div>;

  const displayDepartment = departmentName || position.department || "—";

  // ✅ SỐ NGƯỜI ĐẢM NHẬN
  const assignedCount =
    typeof position.assigneeCount === "number"
      ? position.assigneeCount
      : position.assigneeCode
      ? 1
      : 0;

  const capacity = position.capacity ?? 1;

  return (
    <div className="main-detail">
      <div className="profile-header">
        <h2>Chi tiết chức vụ</h2>
        <div className="profile-actions">
          <button onClick={() => navigate("/hrm/chuc-vu")}>
            <FaArrowLeft style={{ marginRight: 5 }}/> <span>Quay lại</span>
          </button>

          <button
            className="btn-primary"
            onClick={() => navigate(`/hrm/chuc-vu/${code}/chinh-sua`)}
          >
            <FaEdit /> <span>Chỉnh sửa</span>
          </button>
        </div>
      </div>

      <div className="profile-top">
        <div className="profile-main">
          <div className="profile-name">{position.name}</div>

          <div className="profile-sub">
            {position.code} • {displayDepartment} •{" "}
            {position.level || "—"}
          </div>

          <div
            className={`status-badge ${
              position.status === "Hoạt động" ? "active" : "inactive"
            }`}
          >
            {position.status}
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h3>Thông tin chức vụ</h3>
        <div className="profile-grid">
          <Info label="Mã chức vụ" value={position.code} />
          <Info label="Tên chức vụ" value={position.name} />
          <Info label="Phòng ban" value={displayDepartment} />
          <div className="profile-item">
            <div className="profile-label">Người đảm nhận</div>
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
          <Info
            label="Số người đảm nhận"
            value={`${assignedCount} / ${capacity}`}
          />
          <Info label="Cấp bậc" value={position.level} />
          <Info label="Trạng thái" value={position.status} />
          <Info label="Ngày tạo" value={position.createdAt} />
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