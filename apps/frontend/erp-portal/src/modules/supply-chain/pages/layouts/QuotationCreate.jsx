// apps/frontend/erp-portal/src/modules/supply-chain/pages/QuotationCreate.jsx

import QuotationForm from "../../components/layouts/QuotationForm";
import { quotationService } from "../../services/quotation.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function QuotationCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => quotationService.create(data),
    "/supply-chain/bao-gia", // Quay về trang danh sách sau khi tạo thành công
    {
      resourceName: "báo giá",
      
      // Transform dữ liệu trước khi gọi API
      transformPayload: (formData) => {
        return {
           ...formData,
           // [LƯU Ý] Dựa vào JSON mẫu: supplier_id và pr_id là số (Int)
           // Form HTML trả về string, nên cần ép kiểu về Number
           supplier_id: formData.supplier_id,
           pr_id: formData.pr_id,
           
           // Tổng tiền cũng cần là số
           total_amount: Number(formData.total_amount),

           // Đảm bảo các trường ngày tháng đúng định dạng YYYY-MM-DD
           quotation_date: formData.quotation_date,
           valid_until: formData.valid_until,

           // Mặc định khi tạo mới
           status: "PENDING",
           is_selected: false
        };
      },

      onSuccess: (response) => {
         // Log ID của báo giá vừa tạo (nếu cần debug)
         console.log("Created Quotation ID:", response.id);
      }
    }
  );

  return (
    <PageContainer title="Tạo báo giá nhà cung cấp mới">
      <QuotationForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        // Nếu form component hỗ trợ prop disabled để chặn submit 2 lần (khi đang submitting)
        disabled={submitting} 
      />
    </PageContainer>
  );
}