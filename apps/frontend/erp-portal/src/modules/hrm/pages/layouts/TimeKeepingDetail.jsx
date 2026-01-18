// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/TimeKeepingDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { timeKeepingService } from "../../services/timeKeeping.service";
import { employeeService } from "../../services/employee.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import { formatDate } from "../../../../shared/utils/format";
import { useAuthStore } from "../../../../auth/auth.store";
// Giả định bạn có permission tương ứng, nếu chưa hãy thêm vào file constant
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions"; 
import { hasPermission } from "../../../../shared/utils/permission";
import { 
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton 
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

export default function TimeKeepingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  
  // Kiểm tra quyền Edit chấm công (cần đảm bảo constant này tồn tại)
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.HRM_TIME_KEEPING_UPDATE || "TIMEKEEPING_EDIT");

  // 1. Fetch TimeKeeping Info
  const { data: record, loading: recordLoading } = useFetchDetail(timeKeepingService.getById, id);
  
  // 2. State & Hooks bổ trợ
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const { departmentMap, positionMap } = useLookupMaps(); // Map để hiển thị tên Dept/Position từ ID

  // 3. Fetch Employee Detail khi đã có record
  // (Vì record chấm công chỉ lưu employeeId, cần lấy tên để hiển thị cho đẹp)
  useEffect(() => {
    if (!record?.employeeId) return;

    const fetchEmployeeContext = async () => {
      try {
        const emp = await employeeService.getById(record.employeeId);
        // Kiểm tra nếu emp trả về null hoặc undefined
        if (emp) {
            setEmployeeInfo(emp);
        } else {
            console.warn("Không tìm thấy nhân viên với ID:", record.employeeId);
            setEmployeeInfo({ name: "Nhân viên không tồn tại / Đã xóa", code: "N/A" });
        }
      } catch (error) {
        console.error("Lỗi API lấy nhân viên:", error);
        setEmployeeInfo({ name: "Lỗi tải thông tin", code: "ERR" });
      }
    };

    fetchEmployeeContext();
  }, [record]);

  if (recordLoading) return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  // Kiểm tra nếu record null (sai ID trên URL)
  if (!record) return (
      <div style={{ padding: 20 }} className="alert alert-danger">
          Không tìm thấy bản ghi chấm công (ID: {id}). Vui lòng kiểm tra lại URL hoặc dữ liệu.
          <br/>
          <button className="btn btn-sm btn-primary mt-2" onClick={() => navigate("/hrm/cham-cong")}>Quay lại</button>
      </div>
  );

  return (
    <div className="main-detail">
      <DetailHeader 
        title="Chi tiết chấm công"
        onBack={() => navigate("/hrm/cham-cong")}
        actions={!record.deletedAt && canEdit && (
          <EditButton onClick={() => navigate(`/hrm/cham-cong/${id}/chinh-sua`)} />
        )}
      />

      <DetailTop 
        title={employeeInfo ? `${employeeInfo.code} - ${employeeInfo.name}` : "Đang tải thông tin..."}
        subtitle={`Ngày công: ${formatDate(record.date)}`}
        status={record.status}
        // Badge color logic tùy chỉnh theo trạng thái
        statusColor={
            record.status === "Đi muộn" || record.status === "Về sớm" ? "warning" :
            record.status === "Vắng mặt" ? "danger" : "success"
        }
        isDeleted={Boolean(record.deletedAt)}
      />

      <DetailSection title="Thông tin chấm công">
        <DetailGrid>
          <DetailItem label="Ngày" value={formatDate(record.date)} />
          <DetailItem label="Giờ vào" value={record.checkInTime || "—"} />
          <DetailItem label="Giờ ra" value={record.checkOutTime || "—"} />
          <DetailItem label="Số công" value={record.workCount} />
          <DetailItem label="Trạng thái" value={record.status} />
          {record.status === "Đã hủy" && (
             <DetailItem 
                label="Lý do hủy" 
                value={record.cancelReason} 
                span={2} 
                className="text-danger fw-bold" // Style chữ đỏ
             />
          )}
          <DetailItem label="Ghi chú" value={record.note || "Không có ghi chú"} span={2} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Thông tin nhân viên">
        <DetailGrid>
          <DetailItem 
            label="Nhân viên" 
            value={employeeInfo?.name || record.employeeId} 
          />
          <DetailItem 
            label="Phòng ban" 
            value={departmentMap[employeeInfo?.department] || "—"} 
          />
          <DetailItem 
            label="Chức vụ" 
            value={positionMap[employeeInfo?.position] || "—"} 
          />
          <DetailItem 
            label="Trạng thái làm việc" 
            value={employeeInfo?.status || "—"} 
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Metadata">
        <DetailGrid>
          <DetailItem label="Ngày tạo bản ghi" value={formatDate(record.createdAt)} />
          <DetailItem label="Cập nhật lần cuối" value={formatDate(record.updatedAt)} />
        </DetailGrid>
      </DetailSection>
    </div>
  );
}