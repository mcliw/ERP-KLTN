// apps/frontend/erp-portal/src/modules/sales/pages/VoucherCreate.jsx

import VoucherForm from "../../components/layouts/VoucherForm";
import { voucherService } from "../../services/voucher.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function VoucherCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => voucherService.create(data),
    "/sales/ma-giam-gia", // Đường dẫn quay lại danh sách sau khi tạo xong
    {
      resourceName: "mã giảm giá",
      
      // Chuẩn hóa dữ liệu trước khi gửi cho Service
      transformPayload: (formData) => {
        // 1. Chuẩn hóa các trường cơ bản
        const cleanCode = formData.code?.trim().toUpperCase();
        const discountValue = Number(formData.discount_value);
        const minOrder = formData.min_order_amount ? Number(formData.min_order_amount) : null;
        const maxDiscount = formData.max_discount_amount ? Number(formData.max_discount_amount) : null;

        // 2. Tái cấu trúc dữ liệu để khớp với JSON Backend (Nested Structure)
        // Mặc dù json-server chuẩn không tự động lưu nested, nhưng ta chuẩn bị payload chuẩn DTO
        return {
          // Thông tin bảng voucher
          discount_type: formData.discount_type,
          discount_value: discountValue,
          is_active: formData.status === "ACTIVE", // Chuyển đổi status UI sang Boolean DB

          // Thông tin bảng voucher_details (Mã code)
          voucher_details: [
            {
              code: cleanCode,
              is_active: true
            }
          ],

          // Thông tin bảng voucher_constraints (Điều kiện)
          voucher_constraints: [
            {
              min_order_amount: minOrder,
              max_discount_amount: maxDiscount
            }
          ]
        };
      },

      onSuccess: () => {
         // Có thể log hoặc tracking analytics tại đây
         console.log("Create Voucher Process Completed");
      }
    }
  );

  return (
    <PageContainer title="Thêm mới Voucher">
      <VoucherForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting} 
      />
    </PageContainer>
  );
}