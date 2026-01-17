// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/PositionEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import PositionForm from "../../components/layouts/PositionForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { positionService } from "../../services/position.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function PositionEdit() {
  const { code } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(
    () => [
      { label: "Trang chủ", link: "/" },
      { label: "Nhân sự", link: "/hrm" },
      { label: "Chức vụ", link: "/hrm/chuc-vu" },
      { label: `Cập nhật: ${code}`, active: true },
    ],
    [code]
  );

  // 2. Service functions (ổn định dependency)
  const fetcher = useCallback((id) => positionService.getByCode(id, { enrich: true }), []);
  const updater = useCallback((id, data) => positionService.update(id, data), []);

  // 3. Hook chuẩn hóa
  const {
    data: position,
    loading,
    submitting,
    isNotFound,
    isDeleted,
    handleUpdate,
    handleCancel,
  } = useEditResource({
    id: code,
    fetcher,
    updater,
    successPath: "/hrm/chuc-vu",
    options: {
      resourceName: "chức vụ",
      transformPayload: (formData) => {
        const { code, assigneeCount, ...rest } = formData; // 🔒 không gửi code; bỏ field tính toán
        return rest;
      },
    },
  });

  // 4. Render trạng thái đặc biệt
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin chức vụ...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy chức vụ với mã: <strong>{code}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Chức vụ đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Chức vụ <strong>{position?.name || code}</strong> đã bị xóa/ngưng hoạt động.
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
    <PageContainer title={`Cập nhật: ${position?.name || code}`} breadcrumbs={breadcrumbs}>
      <PositionForm
        mode="edit"
        initialData={position}
        hasAssignees={(position?.assigneeCount ?? 0) > 0}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
        checkCodeExists={positionService.checkCodeExists?.bind(positionService)}
      />
    </PageContainer>
  );
}
