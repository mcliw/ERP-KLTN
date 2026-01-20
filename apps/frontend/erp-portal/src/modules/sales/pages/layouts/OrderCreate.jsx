// apps/frontend/erp-portal/src/modules/sales/pages/OrderCreate.jsx

import OrderForm from "../../components/layouts/OrderForm";
import { orderService } from "../../services/order.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function OrderCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => orderService.create(data),
    "/sales/don-hang", // Đường dẫn quay lại trang danh sách sau khi tạo xong
    {
      resourceName: "đơn hàng",
      
      transformPayload: (formData) => {
        // Form OrderForm đã xử lý:
        // 1. Convert số lượng/giá thành Number.
        // 2. Chứa field customer_id thay vì user_id.
        
        // Ở đây ta chỉ cần đảm bảo các trường Optional Key là null nếu rỗng.
        return {
           ...formData,
           voucher_detail_id: formData.voucher_detail_id || null,
           payment_id: formData.payment_id || null,
           // Đảm bảo customer_id là chuỗi (dù form đã xử lý, double check cho an toàn)
           customer_id: String(formData.customer_id),
        };
      },

      onSuccess: () => {
         // Toast thông báo thành công đã được handle bên trong useCreateResource
      }
    }
  );

  return (
    <PageContainer title="Tạo đơn hàng mới">
      <OrderForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        // Truyền trạng thái submitting để form có thể disable nút submit/hiển thị loading
        isLoading={submitting} 
      />
    </PageContainer>
  );
}