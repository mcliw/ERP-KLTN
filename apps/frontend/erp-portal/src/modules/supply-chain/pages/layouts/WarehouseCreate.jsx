// apps/frontend/erp-portal/src/modules/supply-chain/pages/WarehouseCreate.jsx

import WarehouseForm from "../../components/layouts/WarehouseForm";
import { warehouseService } from "../../services/warehouse.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function WarehouseCreate() {
  // Sử dụng hook useCreateResource để tối giản logic
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    // 1. Hàm gọi API
    (data) => warehouseService.create(data),
    
    // 2. Đường dẫn quay về sau khi tạo thành công (Trang danh sách)
    "/supply-chain/kho-hang", 
    
    // 3. Cấu hình thêm
    {
      resourceName: "kho hàng",
      
      // Transform Payload: Xử lý dữ liệu lần cuối trước khi gửi server
      transformPayload: (formData) => {
        return {
            ...formData,
            // Đảm bảo mã kho viết hoa (dù service đã xử lý, làm ở đây để UX đồng bộ ngay)
            code: formData.code ? formData.code.toUpperCase() : "",
            // Đảm bảo address rỗng thì gửi null (theo chuẩn JSON Clean)
            address: formData.address || null 
        };
      },

      onSuccess: () => {
         // Có thể log hoặc thực hiện hành động phụ (tracking analytics...)
         console.log("Đã tạo xong kho hàng mới");
      }
    }
  );

  return (
    <PageContainer title="Thêm mới kho hàng">
      {/* Sử dụng form chung. 
        Không cần truyền initialData vì là mode create (form sẽ tự lấy default)
      */}
      <WarehouseForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        // Có thể truyền prop disabled để chặn sửa form khi đang submitting (nếu Form hỗ trợ)
        disabled={submitting} 
      />
    </PageContainer>
  );
}