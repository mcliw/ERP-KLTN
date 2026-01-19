// apps/frontend/erp-portal/src/modules/supply-chain/pages/QuotationEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import QuotationForm from "../../components/layouts/QuotationForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { quotationService } from "../../services/quotation.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function QuotationEdit() {
  const { id } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Supply Chain", link: "/supply-chain" },
    { label: "Quản lý Báo giá", link: "/supply-chain/bao-gia" },
    { label: `Cập nhật: ${id}`, active: true },
  ], [id]);

  // 2. Định nghĩa các hàm tương tác Service
  const fetcher = useCallback((resourceId) => quotationService.getById(resourceId), []);
  const updater = useCallback((resourceId, data) => quotationService.update(resourceId, data), []);

  // 3. Sử dụng Hook chuẩn hóa
  const { 
    data: quotation, 
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
    successPath: "/supply-chain/bao-gia",
    options: {
      resourceName: "báo giá",
      
      // Xử lý payload trước khi gửi API
      transformPayload: (formData) => {
        const { 
          id: _id, // Loại bỏ ID khỏi body
          createdAt, 
          updatedAt, 
          deletedAt,
          // Loại bỏ các trường object do _expand tạo ra (nếu có) để tránh gửi ngược lên
          supplier,
          purchase_request,
          ...rest 
        } = formData;
        
        return {
           ...rest,
           // [QUAN TRỌNG] Ép kiểu Number cho các khóa ngoại vì JSON Quotation dùng số
           supplier_id: rest.supplier_id,
           pr_id: rest.pr_id,
           total_amount: Number(rest.total_amount),
           
           // Giữ nguyên Date string (YYYY-MM-DD)
           quotation_date: rest.quotation_date,
           valid_until: rest.valid_until
        };
      }
    }
  });

  // 4. Logic kiểm tra trạng thái phiếu (Business Rule)
  // Không cho phép sửa nếu đã Duyệt hoặc Đã chọn mua
  const isLocked = useMemo(() => {
      if (!quotation) return false;
      return quotation.status === "APPROVED" || quotation.is_selected === true;
  }, [quotation]);

  // 5. Render các trạng thái loading/error
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin báo giá...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy báo giá với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Báo giá đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Báo giá <strong>{quotation?.rfq_code}</strong> đã bị xóa.
          Vui lòng khôi phục trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // Trường hợp bị khóa: Hiển thị form ở chế độ Read-only
  if (isLocked) {
    return (
        <PageContainer 
            title={`Chi tiết Báo giá: ${quotation?.rfq_code}`} 
            breadcrumbs={breadcrumbs}
        >
            <div className="alert alert-info mb-4">
                <i className="fa fa-lock mr-2"></i>
                Báo giá này đã được <strong>{quotation.is_selected ? "CHỌN MUA" : "PHÊ DUYỆT"}</strong>. 
                Bạn không thể chỉnh sửa thông tin.
            </div>
            
            <QuotationForm
                mode="edit" 
                initialData={quotation}
                onCancel={handleCancel}
                onSubmit={() => {}} // No-op
                disabled={true} // Chặn mọi thao tác nhập liệu, biến Form thành View-only
            />
        </PageContainer>
    );
  }

  // 6. Render Form chính (Editable)
  return (
    <PageContainer 
      title={`Cập nhật Báo giá: ${quotation?.rfq_code || id}`} 
      breadcrumbs={breadcrumbs}
    >
      <QuotationForm
        mode="edit"
        initialData={quotation}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}