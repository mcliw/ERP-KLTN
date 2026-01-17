import { useParams, useNavigate } from "react-router-dom";
import { onLeaveService } from "../../services/onLeave.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { useAuthStore } from "../../../../auth/auth.store";
import { formatDate } from "../../../../shared/utils/format";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";
import { FaCheck, FaTimes, FaUndo } from "react-icons/fa";
import { 
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton 
} from "../../../../shared/components/DetailLayout";

export default function OnLeaveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.LEAVE_EDIT);

  const { data: onLeave, loading, setData } = useFetchDetail(onLeaveService.getById, id);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!onLeave) return <div style={{ padding: 20 }}>Không tìm thấy đơn nghỉ</div>;

  const isDeleted = Boolean(onLeave.deletedAt);
  const displayInfo = `${onLeave.employeeCode} • ${onLeave.departmentName || "—"} • ${onLeave.positionName || "—"}`;

  // --- Handlers ---
  const handleApprove = async () => {
    if (!window.confirm("Duyệt đơn nghỉ này?")) return;
    try {
      await onLeaveService.approve(id, user?.name || "Admin");
      alert("Đã duyệt đơn thành công!");
      navigate("/hrm/nghi-phep");
    } catch (e) { alert("Lỗi: " + e.message); }
  };

  const handleReject = async () => {
    const reason = window.prompt("Nhập lý do từ chối:");
    if (!reason?.trim()) return;
    try {
      await onLeaveService.reject(id, reason, user?.name || "Admin");
      alert("Đã từ chối đơn!");
      navigate("/hrm/nghi-phep");
    } catch (e) { alert("Lỗi: " + e.message); }
  };

  return (
    <div className="main-detail">
      <DetailHeader 
        title="Chi tiết đơn nghỉ"
        onBack={() => navigate("/hrm/nghi-phep")}
        actions={
          <div style={{display:'flex', gap: 5}}>
            {!isDeleted && onLeave.status === "Chờ duyệt" && canEdit && (
              <>
                <EditButton onClick={() => navigate(`/hrm/nghi-phep/${id}/chinh-sua`)} />
                <button className="btn-success" onClick={handleApprove}><FaCheck /> Duyệt</button>
                <button className="btn-danger" onClick={handleReject}><FaTimes /> Từ chối</button>
              </>
            )}
          </div>
        }
      />

      <DetailTop 
        title={onLeave.employeeName}
        subtitle={displayInfo}
        status={onLeave.status}
        isDeleted={isDeleted}
      />

      <DetailSection title="Thông tin đơn nghỉ">
        <DetailGrid>
          <DetailItem label="Loại nghỉ" value={onLeave.leaveType} />
          <DetailItem label="Từ ngày" value={formatDate(onLeave.fromDate)} />
          <DetailItem label="Đến ngày" value={formatDate(onLeave.toDate)} />
          <DetailItem label="Lý do" value={onLeave.reason} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Thông tin nhân viên">
        <DetailGrid>
           <DetailItem label="Mã NV" value={onLeave.employeeCode} />
           <DetailItem label="Họ tên" value={onLeave.employeeName} />
        </DetailGrid>
      </DetailSection>
      
      {["Đã duyệt", "Từ chối"].includes(onLeave.status) && (
        <DetailSection title="Lịch sử duyệt">
           <DetailGrid>
              <DetailItem label="Người xử lý" value={onLeave.approvedBy} />
              <DetailItem label="Ngày xử lý" value={formatDate(onLeave.approvedAt)} />
              {onLeave.status === "Từ chối" && (
                <DetailItem label="Lý do từ chối" value={onLeave.rejectReason} color="red" fullWidth />
              )}
           </DetailGrid>
        </DetailSection>
      )}
    </div>
  );
}