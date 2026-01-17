// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/EmployeeEdit.jsx
import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import EmployeeForm from "../../components/layouts/EmployeeForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { employeeService } from "../../services/employee.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function EmployeeEdit() {
  const { code } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Nhân sự", link: "/hrm" },
    { label: "Hồ sơ nhân viên", link: "/hrm/ho-so-nhan-vien" },
    { label: `Cập nhật: ${code}`, active: true },
  ], [code]);

  // 2. Định nghĩa các hàm tương tác Service (dùng useCallback để ổn định dependency cho Hook)
  const fetcher = useCallback((id) => employeeService.getByCode(id), []);
  
  // Lưu ý: service.update nhận (code, data)
  const updater = useCallback((id, data) => employeeService.update(id, data), []);

  // 3. Sử dụng Hook chuẩn hóa
  const { 
    data: employee, 
    loading, 
    submitting, 
    isNotFound, 
    isDeleted, 
    handleUpdate, 
    handleCancel 
  } = useEditResource({
    id: code,
    fetcher,
    updater,
    successPath: "/hrm/ho-so-nhan-vien",
    options: {
      resourceName: "nhân viên",
      // Xử lý payload: Loại bỏ các field File Object, chỉ giữ lại URL chuỗi và data text
      transformPayload: (formData) => {
        const { 
          // Các field File object (không gửi lên JSON API)
          avatar, cvFile, healthCertFile, degreeFile, contractFile,
          avatarPreview,
          // Code không được sửa nên bỏ ra khỏi body
          code, 
          ...rest 
        } = formData;
        
        return rest;
      }
    }
  });

  // 4. Render các trạng thái đặc biệt
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin nhân viên...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy hồ sơ nhân viên với mã: <strong>{code}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Hồ sơ đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Hồ sơ nhân viên <strong>{employee?.name}</strong> đã bị xóa hoặc nghỉ việc. 
          Bạn cần khôi phục hồ sơ trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 5. Render Form chính
  return (
    <PageContainer 
      title={`Cập nhật: ${employee?.name || code}`} 
      breadcrumbs={breadcrumbs}
    >
      <EmployeeForm
        mode="edit"
        initialData={employee}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
        // Bind context để đảm bảo check trùng mã hoạt động (dù edit thường disable mã)
        checkCodeExists={employeeService.checkCodeExists.bind(employeeService)}
      />
    </PageContainer>
  );
}