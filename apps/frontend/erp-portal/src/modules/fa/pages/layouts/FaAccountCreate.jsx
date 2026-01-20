// apps/frontend/erp-portal/src/modules/finance/pages/FaAccountCreate.jsx

import FaAccountForm from "../../components/layouts/FaAccountForm";
import { faAccountService } from "../../services/faAccount.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function FaAccountCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => faAccountService.create(data),
    "/finance/he-thong-tai-khoan", // Redirect về danh sách sau khi tạo thành công
    {
      resourceName: "tài khoản kế toán",
      
      // Hook để tiền xử lý dữ liệu trước khi gửi xuống Service/API
      transformPayload: (formData) => {
        return {
            ...formData,
            // 1. Chuẩn hóa Parent ID: Nếu rỗng thì phải là null (Root), nếu có thì phải là Number
            parent_account_id: formData.parent_account_id 
                ? Number(formData.parent_account_id) 
                : null,
            
            // 2. Chuẩn hóa account_code: Viết hoa, bỏ khoảng trắng thừa
            account_code: (formData.account_code || "").trim().toUpperCase(),

            // 3. Đảm bảo is_active là boolean (phòng trường hợp form gửi string "true")
            is_active: String(formData.is_active) === "true" || formData.is_active === true
        };
      },

      onSuccess: () => {
         // Có thể log hoặc tracking analytics tại đây
         console.log("Đã tạo xong tài khoản mới");
      }
    }
  );

  return (
    <PageContainer title="Thêm mới tài khoản kế toán">
      <FaAccountForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        // Truyền trạng thái submitting để Form có thể disable nút submit tránh double-click
        isLoading={submitting} 
      />
    </PageContainer>
  );
}