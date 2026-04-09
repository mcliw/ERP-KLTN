// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/DepartmentEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import DepartmentForm from "../../components/layouts/DepartmentForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { departmentService } from "../../services/department.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function DepartmentEdit() {
  const { code } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(
    () => [
      { label: "Trang chủ", link: "/" },
      { label: "Nhân sự", link: "/hrm" },
      { label: "Phòng ban", link: "/hrm/phong-ban" },
      { label: `Cập nhật: ${code}`, active: true },
    ],
    [code]
  );

  // 2. Service functions (ổn định dependency)
  const fetcher = useCallback((id) => departmentService.getByCode(id, { enrich: true }), []);
  const updater = useCallback((id, data) => departmentService.update(id, data), []);

  // 3. Hook chuẩn hóa
  const {
    data: department,
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
    successPath: "/hrm/phong-ban",
    options: {
      resourceName: "phòng ban",
      transformPayload: (formData) => {
        const { code, employeeCount, ...rest } = formData; // 🔒 không gửi code; các field tính toán cũng bỏ
        return rest;
      },
    },
  });

  // 4. Render trạng thái đặc biệt
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin phòng ban...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy phòng ban với mã: <strong>{code}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Phòng ban đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Phòng ban <strong>{department?.name || code}</strong> đã bị xóa/ngưng hoạt động.
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
      title={`Cập nhật: ${department?.name || code}`}
      breadcrumbs={breadcrumbs}
    >
      <DepartmentForm
        mode="edit"
        initialData={department}
        employeeCount={department?.employeeCount ?? 0}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
        checkCodeExists={departmentService.checkCodeExists?.bind(departmentService)}
      />
    </PageContainer>
  );
}
