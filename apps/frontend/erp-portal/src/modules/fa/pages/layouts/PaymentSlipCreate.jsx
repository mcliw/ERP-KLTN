// apps/frontend/erp-portal/src/modules/finance/pages/PaymentSlipCreate.jsx

import PaymentSlipForm from "../../components/layouts/PaymentSlipForm";
import { paymentSlipService } from "../../services/paymentSlip.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function PaymentSlipCreate() {
  // Sử dụng hook quản lý quy trình tạo mới (Submit, Cancel, Loading state)
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => paymentSlipService.create(data), // Gọi service tạo mới
    "/finance/phieu-chi", // Đường dẫn quay về sau khi tạo thành công
    {
      resourceName: "phiếu chi",
      
      // Chuẩn hóa dữ liệu trước khi gửi xuống Service
      transformPayload: (formData) => {
        return {
          ...formData,
          // Chuẩn hóa ID: Viết hoa, bỏ khoảng trắng
          id: formData.id?.trim().toUpperCase(),
          
          // Đảm bảo số tiền là Number
          amount: Number(formData.amount),
          
          // Trim các trường string
          description: formData.description?.trim(),
          bank_account_number: formData.bank_account_number?.trim(),
          
          // Các trường ID tham chiếu giữ nguyên
          supplier_id: formData.supplier_id,
          purchase_order_ids: formData.purchase_order_ids || [],
        };
      },

      onSuccess: () => {
        console.log("Đã lập phiếu chi thành công");
      }
    }
  );

  return (
    <PageContainer title="Lập phiếu chi mới">
      <PaymentSlipForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        // Không cần truyền supplierOptions hay poList vì Form tự fetch
      />
    </PageContainer>
  );
}