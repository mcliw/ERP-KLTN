// apps/frontend/erp-portal/src/modules/sales/pages/CustomerCreate.jsx

import CustomerForm from "../../components/layouts/CustomerForm";
import { customerService } from "../../services/customer.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function CustomerCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => customerService.create(data),
    "/sales/khach-hang", // Đường dẫn quay lại danh sách khách hàng
    {
      resourceName: "khách hàng",
      
      transformPayload: (formData) => {
        // Chuẩn hóa dữ liệu trước khi gửi lên Server
        return {
          ...formData,
          // Đảm bảo mã khách hàng luôn viết hoa (tùy quy định nghiệp vụ)
          code: formData.code?.trim().toUpperCase(),
          full_name: formData.full_name?.trim(),
          email: formData.email?.trim().toLowerCase(),
        };
      },

      onSuccess: () => {
         console.log("Đã tạo mới khách hàng thành công");
      }
    }
  );

  return (
    <PageContainer title="Thêm mới khách hàng">
      <CustomerForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting} 
      />
    </PageContainer>
  );
}