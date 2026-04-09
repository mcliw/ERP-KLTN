// apps/frontend/erp-portal/src/modules/supply-chain/pages/PurchaseOrderEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import PurchaseOrderForm from "../../components/layouts/PurchaseOrderForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { purchaseOrderService } from "../../services/purchaseOrder.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function PurchaseOrderEdit() {
  const { id } = useParams();

  // 1. Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Supply Chain", link: "/supply-chain" },
    { label: "Quản lý Đơn mua hàng", link: "/supply-chain/don-mua-hang" },
    { label: `Cập nhật: ${id}`, active: true },
  ], [id]);

  // 2. Định nghĩa fetcher và updater
  // Sử dụng useCallback để tránh render lại không cần thiết
  const fetcher = useCallback((resourceId) => purchaseOrderService.getById(resourceId), []);
  const updater = useCallback((resourceId, data) => purchaseOrderService.update(resourceId, data), []);

  // 3. Hook quản lý Edit (Core Logic)
  const { 
    data: poData, 
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
    successPath: "/supply-chain/don-mua-hang",
    options: {
      resourceName: "đơn mua hàng",

      // --- [QUAN TRỌNG] Transform dữ liệu KHI LOAD về ---
      // Fix lỗi mất items: Map 'po_items' (từ DB) thành 'items' (cho Form)
      transformLoadData: (data) => {
        if (!data) return null;
        return {
            ...data,
            // Ưu tiên po_items (nếu service trả về), fallback sang items hoặc mảng rỗng
            items: data.po_items || data.items || []
        };
      },

      // --- Xử lý payload trước khi GỬI ĐI (Update) ---
      transformPayload: (formData) => {
        // Loại bỏ các trường object quan hệ (expand) để tránh gửi cục data quá lớn/lỗi
        const { 
          id: _id, 
          createdAt, updatedAt, deletedAt,
          supplier, quotation, po_items, 
          ...rest 
        } = formData;
        
        return {
           ...rest,
           // Ép kiểu số để đảm bảo tính toán đúng
           total_amount: Number(rest.total_amount || 0),
           tax_amount: Number(rest.tax_amount || 0),
           discount_amount: Number(rest.discount_amount || 0),
           quotation_id: String(rest.quotation_id),
           supplier_id: String(rest.supplier_id),
           
           // Format lại items kỹ càng trước khi gửi để Service xử lý đồng bộ
           items: Array.isArray(formData.items) ? formData.items.map(item => ({
               product_id: item.product_id,
               quantity_ordered: Number(item.quantity_ordered),
               unit_price: Number(item.unit_price),
               total_line_amount: Number(item.total_line_amount)
           })) : []
        };
      }
    }
  });

  // 4. Logic khóa đơn (Approved/Completed/Cancelled)
  // Ngăn chặn chỉnh sửa nếu đơn hàng đã chốt
  const isLocked = useMemo(() => {
      if (!poData) return false;
      const lockedStatus = ["APPROVED", "COMPLETED", "CANCELLED"];
      return lockedStatus.includes(poData.status);
  }, [poData]);

  // 5. Render States (Loading, Error, Deleted)
  if (loading) return (
      <PageContainer title="Đang tải..." breadcrumbs={breadcrumbs}>
        <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
            </div>
        </div>
      </PageContainer>
  );

  if (isNotFound) return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger shadow-sm">
            <i className="fa fa-exclamation-triangle mr-2"></i>
            Không tìm thấy đơn hàng ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
  );

  if (isDeleted) return (
      <PageContainer title="Đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning shadow-sm">
            <i className="fa fa-trash mr-2"></i>
            Đơn hàng <strong>{poData?.po_code}</strong> đã bị xóa (Soft Deleted).
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại</button>
      </PageContainer>
  );

  // 6. Render Form
  
  // Trường hợp Đơn hàng bị KHÓA (Read-only View)
  if (isLocked) {
    return (
        <PageContainer title={`Chi tiết: ${poData?.po_code}`} breadcrumbs={breadcrumbs}>
            <div className="alert alert-info mb-4 shadow-sm">
                <i className="fa fa-lock mr-2"></i> 
                Đơn hàng đang ở trạng thái <strong>{poData.status}</strong> và không thể chỉnh sửa.
            </div>
            {/* Truyền disabled=true để khóa toàn bộ form */}
            <PurchaseOrderForm 
                mode="edit" 
                initialData={poData} 
                onCancel={handleCancel} 
                onSubmit={()=>{}} 
                disabled={true} 
            />
        </PageContainer>
    );
  }

  // Trường hợp Edit bình thường
  return (
    <PageContainer title={`Cập nhật: ${poData?.po_code}`} breadcrumbs={breadcrumbs}>
      <PurchaseOrderForm
        mode="edit"
        initialData={poData}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}