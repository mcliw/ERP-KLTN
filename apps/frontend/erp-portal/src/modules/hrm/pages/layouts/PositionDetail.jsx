import { useParams, useNavigate } from "react-router-dom";
import { positionService } from "../../services/position.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import { formatDate } from "../../../../shared/utils/format";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";
import { 
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton 
} from "../../../../shared/components/DetailLayout";
import "../styles/detail.css";

export default function PositionDetail() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { departmentMap } = useLookupMaps();
  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.POSITION_EDIT);

  const { data: position, loading } = useFetchDetail(positionService.getByCode, code);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!position) return <div style={{ padding: 20 }}>Không tìm thấy chức vụ</div>;

  const assignedCount = typeof position.assigneeCount === "number" ? position.assigneeCount : (position.assignees?.length ?? 0);

  return (
    <div className="main-detail">
      <DetailHeader 
        title="Chi tiết chức vụ"
        onBack={() => navigate("/hrm/chuc-vu")}
        actions={!position.deletedAt && canEdit && (
          <EditButton onClick={() => navigate(`/hrm/chuc-vu/${code}/chinh-sua`)} />
        )}
      />

      <DetailTop 
        title={position.name}
        subtitle={`${position.code} • ${departmentMap[position.department] || position.department || "—"}`}
        status={position.status}
        isDeleted={Boolean(position.deletedAt)}
      />

      <DetailSection title="Thông tin chức vụ">
        <DetailGrid>
          <DetailItem label="Mã chức vụ" value={position.code} />
          <DetailItem label="Tên chức vụ" value={position.name} />
          <DetailItem label="Phòng ban" value={departmentMap[position.department]} />
          <DetailItem label="Nhân sự" value={`${assignedCount} / ${position.capacity || 1}`} />
          <DetailItem label="Mô tả" value={position.description} />
          
          {/* List nhân viên đảm nhận */}
          <div className="profile-item full-width">
            <div className="profile-label">Người đảm nhận</div>
            <div className="profile-value">
              {position.assignees?.length ? (
                <ul>{position.assignees.map((e) => <li key={e.code}>{e.name}</li>)}</ul>
              ) : "—"}
            </div>
          </div>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Trạng thái">
        <DetailGrid>
          <DetailItem label="Ngày tạo" value={formatDate(position.createdAt)} />
          <DetailItem label="Cập nhật" value={formatDate(position.updatedAt)} />
        </DetailGrid>
      </DetailSection>
    </div>
  );
}