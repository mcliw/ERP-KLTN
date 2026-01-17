// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/TimeKeepingEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import TimeKeepingForm from "../../components/layouts/TimeKeepingForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { timeKeepingService } from "../../services/timeKeeping.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function TimeKeepingEdit() {
  // Chấm công thường dùng ID (số hoặc uuid) làm định danh
  const { id } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(
    () => [
      { label: "Trang chủ", link: "/" },
      { label: "Nhân sự", link: "/hrm" },
      { label: "Chấm công", link: "/hrm/cham-cong" },
      { label: `Cập nhật #${id}`, active: true },
    ],
    [id]
  
  );

  // 2. Service functions (bọc useCallback để ổn định dependency)
  const fetcher = useCallback((recordId) => timeKeepingService.getById(recordId), []);
  const updater = useCallback((recordId, data) => timeKeepingService.update(recordId, data), []);

  // 3. Hook chuẩn hóa cho Edit
  const {
    data: timeKeepingData,
    loading,
    submitting,
    isNotFound,
    isDeleted,
    handleUpdate,
    handleCancel,
  } = useEditResource({
    id,
    fetcher,
    updater,
    successPath: "/hrm/cham-cong",
    options: {
      resourceName: "bảng công",
      // Transform payload: Loại bỏ các trường không cần gửi lên server khi update
      transformPayload: (formData) => {
        const { 
            id, 
            employeeId, // Thường không cho đổi nhân viên khi sửa công
            employeeName, 
            employeeCode,
            departmentName,
            workCount, // Backend tự tính lại
            createdAt, 
            updatedAt, 
            ...rest 
        } = formData;
        return rest;
      },
    },
  });

  // 4. Render trạng thái đặc biệt
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin chấm công...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy bản ghi chấm công với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Bản ghi đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Bản ghi chấm công này đã bị xóa hoặc hủy bỏ.
          Bạn cần khôi phục trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  // 5. Render Form chính
  return (
    <PageContainer
      title={`Cập nhật chấm công #${id}`}
      breadcrumbs={breadcrumbs}
    >
      <TimeKeepingForm
        mode="edit"
        initialData={timeKeepingData}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}