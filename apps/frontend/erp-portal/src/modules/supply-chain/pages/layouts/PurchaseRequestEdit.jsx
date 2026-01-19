// apps/frontend/erp-portal/src/modules/supply-chain/pages/PurchaseRequestEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import PurchaseRequestForm from "../../components/layouts/PurchaseRequestForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { purchaseRequestService } from "../../services/purchaseRequest.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function PurchaseRequestEdit() {
  const { id } = useParams();

  // 1. Breadcrumbs động
  // Sử dụng pr_code để hiển thị trên breadcrumb thay vì ID số
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Supply Chain", link: "/supply-chain" },
    { label: "Yêu cầu mua hàng", link: "/supply-chain/yeu-cau-mua-hang" },
    { label: `Cập nhật: ${id}`, active: true },
  ], [id]);

  // 2. Định nghĩa các hàm tương tác Service
  const fetcher = useCallback((resourceId) => purchaseRequestService.getById(resourceId), []);
  const updater = useCallback((resourceId, data) => purchaseRequestService.update(resourceId, data), []);

  // 3. Sử dụng Hook chuẩn hóa
  const { 
    data: purchaseRequest, 
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
    successPath: "/supply-chain/yeu-cau-mua-hang",
    options: {
      resourceName: "phiếu yêu cầu",
      
      // Xử lý payload trước khi gửi API
      transformPayload: (formData) => {
        const { 
          id: _id, // Loại bỏ ID khỏi body
          createdAt, 
          updatedAt, 
          deletedAt,
          ...rest 
        } = formData;
        
        // Ép kiểu dữ liệu số cho các trường quan trọng
        return {
           ...rest,
           requester_id: Number(rest.requester_id),
           department_id: Number(rest.department_id),
           
           // Nếu Backend hỗ trợ update nested items trong cùng 1 request PUT
           // thì cần map items. Nếu không, service sẽ tự lọc bỏ field này.
           items: Array.isArray(rest.items) ? rest.items.map(item => ({
               ...item,
               product_id: Number(item.product_id),
               quantity_requested: Number(item.quantity_requested)
           })) : []
        };
      }
    }
  });

  // 4. Logic kiểm tra trạng thái phiếu (Business Rule)
  // Không cho phép sửa phiếu đã Duyệt hoặc Hoàn thành
  const isLocked = useMemo(() => {
      if (!purchaseRequest) return false;
      return ["APPROVED", "COMPLETED", "CANCELLED"].includes(purchaseRequest.status);
  }, [purchaseRequest]);

  // 5. Render các trạng thái loading/error
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin phiếu yêu cầu...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy phiếu yêu cầu với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Phiếu đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Phiếu <strong>{purchaseRequest?.pr_code}</strong> đã bị xóa.
          Vui lòng khôi phục trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  if (isLocked) {
    return (
        <PageContainer 
            title={`Chi tiết: ${purchaseRequest?.pr_code}`} 
            breadcrumbs={breadcrumbs}
        >
            <div className="alert alert-info mb-4">
                Phiếu này đang ở trạng thái <strong>{purchaseRequest.status}</strong>. 
                Bạn không thể chỉnh sửa thông tin.
            </div>
            {/* Reuse Form ở chế độ xem (có thể disable toàn bộ input hoặc truyền prop readOnly) */}
            <PurchaseRequestForm
                mode="edit" // Vẫn để edit để hiển thị dữ liệu
                initialData={purchaseRequest}
                onCancel={handleCancel}
                onSubmit={() => {}} // No-op
                // Giả định component Form của bạn hỗ trợ disabled toàn bộ fieldset
                disabled={true} 
            />
        </PageContainer>
    );
  }

  // 6. Render Form chính (Editable)
  return (
    <PageContainer 
      title={`Cập nhật: ${purchaseRequest?.pr_code || id}`} 
      breadcrumbs={breadcrumbs}
    >
      <PurchaseRequestForm
        mode="edit"
        initialData={purchaseRequest}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}