// apps/frontend/erp-portal/src/modules/sales/pages/OrderEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import OrderForm from "../../components/layouts/OrderForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { orderService } from "../../services/order.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function OrderEdit() {
  const { id } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Bán hàng", link: "/sales" },
    { label: "Đơn hàng", link: "/sales/don-hang" },
    { label: `Cập nhật: #${id}`, active: true },
  ], [id]);

  // 2. Định nghĩa các hàm tương tác Service
  const fetcher = useCallback((resourceId) => orderService.getById(resourceId), []);
  const updater = useCallback((resourceId, data) => orderService.update(resourceId, data), []);

  // 3. Sử dụng Hook chuẩn hóa
  const { 
    data: order, 
    loading, 
    submitting, 
    isNotFound, 
    handleUpdate, 
    handleCancel 
  } = useEditResource({
    id, 
    fetcher,
    updater,
    successPath: "/sales/don-hang",
    options: {
      resourceName: "đơn hàng",
      // Xử lý payload trước khi gửi API
      transformPayload: (formData) => {
        const { 
          // Loại bỏ các trường hệ thống không được update
          id: _id, 
          created_at, 
          updated_at, 
          items, // Service hiện tại tách riêng items, update header ko gửi items
          user_id, // Loại bỏ user_id cũ nếu có
          ...rest 
        } = formData;
        
        // Làm sạch dữ liệu khóa ngoại
        return {
          ...rest,
          // Đảm bảo customer_id đúng định dạng chuỗi
          customer_id: rest.customer_id ? String(rest.customer_id) : null,
          voucher_detail_id: rest.voucher_detail_id || null,
          payment_id: rest.payment_id || null,
          // Đảm bảo shipping_address luôn có giá trị
          shipping_address: rest.shipping_address?.trim(),
        };
      }
    }
  });

  // 4. Logic kiểm tra trạng thái khóa (Business Rule)
  const isLocked = useMemo(() => {
    if (!order) return false;
    // Không cho sửa đơn đã Hoàn thành hoặc Đã hủy
    return ["COMPLETED", "CANCELLED"].includes(order.order_status);
  }, [order]);

  // 5. Render các trạng thái UI
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin đơn hàng...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy đơn hàng với Mã: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // Check trạng thái đơn hàng để khóa Form
  if (isLocked) {
    const statusLabel = order.order_status === "COMPLETED" ? "đã hoàn thành" : "đã hủy";
    return (
      <PageContainer title={`Chi tiết đơn hàng #${id}`} breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Đơn hàng này <strong>{statusLabel}</strong>. Bạn không thể chỉnh sửa thông tin được nữa.
        </div>
        
        {/* Vẫn hiển thị Form nhưng ở chế độ View Only */}
        <div style={{ pointerEvents: "none", opacity: 0.8, marginTop: 20 }}>
            <OrderForm
                mode="view" // Chế độ chỉ xem
                initialData={order}
                onCancel={handleCancel}
            />
        </div>
        
        <div style={{ marginTop: 20 }}>
             <button className="btn btn-secondary" onClick={handleCancel}>Quay lại danh sách</button>
        </div>
      </PageContainer>
    );
  }

  // 6. Render Form chính (Edit Mode)
  return (
    <PageContainer 
      title={`Cập nhật đơn hàng: #${id}`} 
      breadcrumbs={breadcrumbs}
    >
      <OrderForm
        mode="edit"
        initialData={order}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}