// apps/frontend/erp-portal/src/modules/supply-chain/pages/PurchaseRequestCreate.jsx

import PurchaseRequestForm from "../../components/layouts/PurchaseRequestForm";
import { purchaseRequestService } from "../../services/purchaseRequest.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function PurchaseRequestCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => purchaseRequestService.create(data),
    "/supply-chain/yeu-cau-mua-hang", // Quay về trang danh sách sau khi tạo thành công
    {
      resourceName: "phiếu yêu cầu",
      
      // Transform dữ liệu trước khi gọi API
      transformPayload: (formData) => {
        return {
            ...formData,
            // [SỬA LỖI] Không ép kiểu Number() cho ID nữa vì dữ liệu là String ("69ca", "8503"...)
            requester_id: formData.requester_id, 
            department_id: formData.department_id,
            
            // Xử lý mảng items
            items: formData.items.map(item => ({
                ...item,
                // ID sản phẩm cũng giữ nguyên là String
                product_id: item.product_id,
                
                // Chỉ ép kiểu Số cho số lượng
                quantity_requested: Number(item.quantity_requested),
                
                // expected_date giữ nguyên string YYYY-MM-DD
            }))
        };
      },

      onSuccess: (response) => {
         // Có thể log hoặc thực hiện hành động phụ sau khi tạo
         console.log("Created PR ID:", response.id);
      }
    }
  );

  return (
    <PageContainer title="Tạo yêu cầu mua hàng mới">
      <PurchaseRequestForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        // Nếu form component hỗ trợ prop disabled để chặn submit 2 lần
        disabled={submitting} 
      />
    </PageContainer>
  );
}