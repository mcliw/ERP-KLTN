// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/SalaryDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { salaryService } from "../../services/salary.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import { useAuthStore } from "../../../../auth/auth.store";
// Giả định bạn đã thêm quyền SALARY_EDIT vào file permissions
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions"; 
import { hasPermission } from "../../../../shared/utils/permission";
import { 
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton 
} from "../../../../shared/components/DetailLayout";
import "../styles/detail.css";

// Helper format tiền tệ cục bộ
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export default function SalaryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  
  // Kiểm tra quyền (Tuỳ chỉnh theo file permission thực tế của bạn)
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.SALARY_EDIT || "salary.edit");

  // 1. Fetch Salary Info
  // Service getById đã enrich thông tin nhân viên (employeeName, employeeCode)
  const { data: salary, loading } = useFetchDetail(salaryService.getById, id);

  // Tính tổng thu nhập dự kiến (Lương + Phụ cấp)
  const totalIncome = useMemo(() => {
    if (!salary) return 0;
    return (Number(salary.baseSalary) || 0) + (Number(salary.allowance) || 0);
  }, [salary]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải thông tin Lương & Phúc lợi...</div>;
  if (!salary) return <div style={{ padding: 20 }}>Không tìm thấy bản ghi Lương & Phúc lợi</div>;

  return (
    <div className="main-detail">
      <DetailHeader 
        title="Chi tiết Lương & Phúc lợi"
        onBack={() => navigate("/hrm/quan-ly-luong")}
        actions={!salary.deletedAt && canEdit && (
          // Nút chỉnh sửa chuyển hướng sang trang edit
          <EditButton onClick={() => navigate(`/hrm/quan-ly-luong/${id}/chinh-sua`)} />
        )}
      />

      {/* Phần Top: Hiển thị Tên nhân viên và Trạng thái hợp đồng */}
      <DetailTop 
        title={salary.employeeName || "Nhân viên chưa xác định"}
        subtitle={`Mã NV: ${salary.employeeCode} | ID Hợp đồng: ${salary.id}`}
        status={salary.statusLabel || salary.status}
        isDeleted={Boolean(salary.deletedAt)}
      />

      {/* Phần 1: Chi tiết thu nhập */}
      <DetailSection title="Thông tin Thu nhập & Bảo hiểm">
        <DetailGrid>
          <DetailItem 
            label="Lương cơ bản" 
            value={formatCurrency(salary.baseSalary)} 
            className="fw-bold text-primary" // Highlight
          />
          <DetailItem 
            label="Phụ cấp" 
            value={formatCurrency(salary.allowance)} 
          />
          <DetailItem 
            label="Tổng thu nhập" 
            value={formatCurrency(totalIncome)} 
            className="fw-bold"
          />
          <DetailItem 
            label="Mức lương đóng BH" 
            value={formatCurrency(salary.insuranceSalary)} 
          />
        </DetailGrid>
      </DetailSection>

      {/* Phần 2: Thông tin quản lý */}
      <DetailSection title="Thông tin quản lý">
        <DetailGrid>
          <DetailItem 
            label="Ngày hiệu lực" 
            value={formatDate(salary.effectiveDate)} 
          />
          <DetailItem 
            label="Ngày tạo" 
            value={formatDate(salary.createdAt)} 
          />
          <DetailItem 
            label="Cập nhật lần cuối" 
            value={salary.updatedAt ? formatDate(salary.updatedAt) : "—"} 
          />
           <DetailItem 
            label="Người tạo" 
            value={salary.createdBy || "Admin"} // Ví dụ nếu có field này
          />
        </DetailGrid>
      </DetailSection>

      {/* Phần 3: Cảnh báo (nếu có) */}
      {salary.deletedAt && (
        <div className="alert alert-danger mx-4 mt-3">
          Hợp đồng này đã bị xoá vào ngày {formatDate(salary.deletedAt)}.
        </div>
      )}
      
      {salary.status === "Hết hạn" && (
        <div className="alert alert-warning mx-4 mt-3">
          Hợp đồng này đã hết hiệu lực.
        </div>
      )}
    </div>
  );
}