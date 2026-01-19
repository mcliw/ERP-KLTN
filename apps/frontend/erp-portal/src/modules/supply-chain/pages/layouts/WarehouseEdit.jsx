// apps/frontend/erp-portal/src/modules/supply-chain/pages/WarehouseEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import WarehouseForm from "../../components/layouts/WarehouseForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { warehouseService } from "../../services/warehouse.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function WarehouseEdit() {
  // Lấy ID từ URL (VD: /supply-chain/kho-hang/1/chinh-sua)
  const { id } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Supply Chain", link: "/supply-chain" },
    { label: "Kho bãi", link: "/supply-chain/kho-hang" },
    { label: `Cập nhật: ${id}`, active: true },
  ], [id]);

  // 2. Định nghĩa các hàm tương tác Service
  // useCallback để tránh tạo lại hàm mỗi lần render, gây fetch loop
  const fetcher = useCallback((resourceId) => warehouseService.getById(resourceId), []);
  
  const updater = useCallback((resourceId, data) => warehouseService.update(resourceId, data), []);

  // 3. Sử dụng Hook chuẩn hóa (useEditResource)
  const { 
    data: warehouse, 
    loading, 
    submitting, 
    isNotFound, 
    isDeleted, 
    handleUpdate, 
    handleCancel 
  } = useEditResource({
    id, // Truyền ID lấy từ URL
    fetcher,
    updater,
    successPath: "/supply-chain/kho-hang",
    options: {
      resourceName: "kho hàng",
      // Xử lý payload trước khi gửi API (Clean Data)
      transformPayload: (formData) => {
        const { 
          // Loại bỏ ID và các trường metadata do hệ thống quản lý
          // Lưu ý: Dữ liệu JSON warehouse dùng snake_case
          id: _id, 
          createdAt, 
          updatedAt, 
          deletedAt,
          ...rest 
        } = formData;
        
        // Logic nghiệp vụ:
        // 1. Mã kho luôn viết hoa
        if (rest.code) rest.code = rest.code.toUpperCase();
        
        // 2. Address rỗng -> null
        if (!rest.address || rest.address.trim() === "") {
            rest.address = null;
        }

        return rest;
      }
    }
  });

  // 4. Render các trạng thái đặc biệt
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin kho hàng...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy kho hàng với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Kho hàng đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Kho hàng <strong>{warehouse?.name}</strong> đã bị xóa. 
          Bạn cần vào mục "Khôi phục" để kích hoạt lại trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 5. Render Form chính
  return (
    <PageContainer 
      title={`Cập nhật: ${warehouse?.name || id}`} 
      breadcrumbs={breadcrumbs}
    >
      <WarehouseForm
        mode="edit"
        initialData={warehouse}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
        // Form Warehouse tự xử lý field readonly (Mã kho) dựa trên mode="edit"
      />
    </PageContainer>
  );
}