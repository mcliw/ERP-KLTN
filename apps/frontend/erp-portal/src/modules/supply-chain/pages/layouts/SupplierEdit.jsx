// apps/frontend/erp-portal/src/modules/supply-chain/pages/resources/SupplierEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import SupplierForm from "../../components/layouts/SupplierForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { supplierService } from "../../services/supplier.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function SupplierEdit() {
  const { code } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Quản lý", link: "/supply-chain" },
    { label: "Nhà cung cấp", link: "/supply-chain/nha-cung-cap" },
    { label: `Cập nhật: ${code}`, active: true },
  ], [code]);

  // 2. Định nghĩa các hàm tương tác Service (dùng useCallback để ổn định dependency cho Hook)
  const fetcher = useCallback((id) => supplierService.getByCode(id), []);
  
  // Lưu ý: service.update nhận (code, data)
  const updater = useCallback((id, data) => supplierService.update(id, data), []);

  // 3. Sử dụng Hook chuẩn hóa
  const { 
    data: supplier, 
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
    successPath: "/supply-chain/nha-cung-cap",
    options: {
      resourceName: "nhà cung cấp",
      // Xử lý payload: Loại bỏ các field File Object, chỉ giữ lại URL chuỗi và data text
      transformPayload: (formData) => {
        const { 
          // Các field File object (không gửi lên JSON API)
          contractFile,
          // Code không được sửa nên bỏ ra khỏi body để an toàn
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
        <div className="text-center py-5">Đang lấy thông tin nhà cung cấp...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy nhà cung cấp với mã: <strong>{code}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Dữ liệu đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Nhà cung cấp <strong>{supplier?.name}</strong> đã bị xóa khỏi hệ thống. 
          Bạn cần khôi phục dữ liệu trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 5. Render Form chính
  return (
    <PageContainer 
      title={`Cập nhật: ${supplier?.name || code}`} 
      breadcrumbs={breadcrumbs}
    >
      <SupplierForm
        mode="edit"
        initialData={supplier}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
        // Bind context để đảm bảo check trùng mã hoạt động (dù edit thường disable mã)
        checkCodeExists={supplierService.checkCodeExists.bind(supplierService)}
      />
    </PageContainer>
  );
}