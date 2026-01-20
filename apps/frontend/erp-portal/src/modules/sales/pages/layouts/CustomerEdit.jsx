// apps/frontend/erp-portal/src/modules/sales/pages/CustomerEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import CustomerForm from "../../components/layouts/CustomerForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { customerService } from "../../services/customer.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function CustomerEdit() {
  // Lấy ID khách hàng từ URL (VD: /sales/khach-hang/C001/chinh-sua)
  const { id } = useParams();

  // 1. Breadcrumbs động cho Module sales
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Sales", link: "/sales" },
    { label: "Khách hàng", link: "/sales/khach-hang" },
    { label: `Cập nhật: ${id}`, active: true },
  ], [id]);

  // 2. Định nghĩa các hàm tương tác Service
  const fetcher = useCallback((resourceId) => customerService.getById(resourceId), []);
  
  const updater = useCallback((resourceId, data) => customerService.update(resourceId, data), []);

  // 3. Sử dụng Hook chuẩn hóa để quản lý trạng thái Edit
  const { 
    data: customer, 
    loading, 
    submitting, 
    isNotFound, 
    isDeleted, 
    handleUpdate, 
    handleCancel 
  } = useEditResource({
    id, 
    fetcher,
    updater,
    successPath: "/sales/khach-hang",
    options: {
      resourceName: "khách hàng",
      // Xử lý dữ liệu trước khi gửi API
      transformPayload: (formData) => {
        const { 
          id: _id, 
          code, // Giữ lại code nếu Backend yêu cầu, hoặc bỏ nếu chỉ dùng ID trên URL
          created_at, 
          updated_at, 
          deleted_at,
          ...rest 
        } = formData;
        
        // Làm sạch dữ liệu chuỗi
        return {
          ...rest,
          full_name: rest.full_name?.trim(),
          email: rest.email?.trim().toLowerCase(),
        };
      }
    }
  });

  // 4. Render trạng thái Đang tải
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin khách hàng...</div>
      </PageContainer>
    );
  }

  // 5. Render trạng thái Không tìm thấy (404)
  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy khách hàng với mã hệ thống: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 6. Render trạng thái Đã bị xóa (Soft-deleted)
  if (isDeleted) {
    return (
      <PageContainer title="Khách hàng đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Khách hàng <strong>{customer?.full_name}</strong> hiện đang nằm trong thùng rác hoặc đã ngừng hoạt động. 
          Bạn cần khôi phục dữ liệu trước khi có thể chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 7. Render Form chỉnh sửa chính
  return (
    <PageContainer 
      title={`Cập nhật: ${customer?.full_name || id}`} 
      breadcrumbs={breadcrumbs}
    >
      <CustomerForm
        mode="edit"
        initialData={customer}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}