// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/OnLeaveEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import OnLeaveForm from "../../components/layouts/OnLeaveForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { onLeaveService } from "../../services/onLeave.service";
import { useAuthStore } from "../../../../auth/auth.store";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function OnLeaveEdit() {
  const { id } = useParams();
  const { user } = useAuthStore();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(
    () => [
      { label: "Trang chủ", link: "/" },
      { label: "Nhân sự", link: "/hrm" },
      { label: "Nghỉ phép", link: "/hrm/nghi-phep" },
      { label: `Cập nhật: ${id}`, active: true },
    ],
    [id]
  );

  // 2. Service functions (ổn định dependency)
  const fetcher = useCallback((leaveId) => onLeaveService.getById(leaveId), []);
  const updater = useCallback((leaveId, data) => onLeaveService.update(leaveId, data), []);

  // 3. Hook chuẩn hóa
  const {
    data: onLeave,
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
    successPath: "/hrm/nghi-phep",
    options: {
      resourceName: "đơn nghỉ phép",
      transformPayload: (formData) => {
        // giữ đúng nghiệp vụ: không cho đổi nhân viên khi edit
        const { employeeCode, ...rest } = formData;
        return rest;
      },
    },
  });

  // 4. Render trạng thái đặc biệt
  if (!id) {
    return (
      <PageContainer title="Thiếu thông tin" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">Thiếu ID để chỉnh sửa đơn nghỉ phép.</div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin đơn nghỉ phép...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy đơn nghỉ phép với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Đơn đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Đơn nghỉ phép <strong>{id}</strong> đã bị xóa/ngưng hoạt động. Bạn cần khôi phục
          trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  // 5. Render Form chính
  return (
    <PageContainer title={`Cập nhật đơn nghỉ: ${id}`} breadcrumbs={breadcrumbs}>
      <OnLeaveForm
        mode="edit"
        initialData={onLeave}
        currentUser={user}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}
