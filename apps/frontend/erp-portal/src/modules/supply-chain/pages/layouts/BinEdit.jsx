// apps/frontend/erp-portal/src/modules/supply-chain/pages/BinEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import BinForm from "../../components/layouts/BinForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { binService } from "../../services/bin.service";
import { warehouseService } from "../../services/warehouse.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";

export default function BinEdit() {
  // Lấy ID từ URL (VD: /supply-chain/vi-tri-kho/101/chinh-sua)
  const { id } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Supply Chain", link: "/supply-chain" },
    { label: "Vị trí kho", link: "/supply-chain/vi-tri-kho" },
    { label: `Cập nhật: ${id}`, active: true },
  ], [id]);

  // 2. Lấy danh sách kho để truyền vào Form Select
  // Dùng useAsyncData để fetch list kho độc lập
  const { data: warehouses } = useAsyncData(warehouseService.getAll);

  const warehouseOptions = useMemo(() => {
    if (!warehouses) return [];
    return warehouses.map((w) => ({ value: w.id, label: w.name }));
  }, [warehouses]);

  // 3. Định nghĩa các hàm tương tác Service cho useEditResource
  const fetcher = useCallback((resourceId) => binService.getById(resourceId), []);
  const updater = useCallback((resourceId, data) => binService.update(resourceId, data), []);

  // 4. Sử dụng Hook chuẩn hóa (useEditResource)
  const { 
    data: bin, 
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
    successPath: "/supply-chain/vi-tri-kho",
    options: {
      resourceName: "vị trí kho",
      // Xử lý payload trước khi gửi API
      transformPayload: (formData) => {
        const { 
          id: _id, 
          createdAt, 
          updatedAt, 
          deletedAt,
          ...rest 
        } = formData;
        
        // Logic nghiệp vụ:
        // 1. Mã vị trí viết hoa
        if (rest.code) rest.code = rest.code.toUpperCase();

        // 2. Ép kiểu số cho các trường quan trọng (Tránh lỗi string từ form)
        rest.warehouse_id = Number(rest.warehouse_id);
        rest.max_capacity = Number(rest.max_capacity) || 0;

        return rest;
      }
    }
  });

  // 5. Render các trạng thái đặc biệt
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin vị trí kho...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy vị trí với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Vị trí đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Vị trí <strong>{bin?.code}</strong> đã bị xóa. 
          Bạn cần vào mục "Khôi phục" để kích hoạt lại trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 6. Render Form chính
  return (
    <PageContainer 
      // Bin thường hiển thị Code thay vì Name
      title={`Cập nhật: ${bin?.code || id}`} 
      breadcrumbs={breadcrumbs}
    >
      <BinForm
        mode="edit"
        initialData={bin}
        warehouseOptions={warehouseOptions} // Truyền options kho vào form
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}