// apps/frontend/erp-portal/src/modules/finance/pages/PostingRulesCreate.jsx

import PostingRulesForm from "../../components/layouts/PostingRulesForm";
import { postingRulesService } from "../../services/postingRules.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function PostingRulesCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => postingRulesService.create(data),
    "/finance/dinh-khoan", // Redirect về danh sách Quy tắc sau khi tạo thành công
    {
      resourceName: "quy tắc định khoản",
      
      // Hook để tiền xử lý dữ liệu trước khi gửi xuống Service/API
      transformPayload: (formData) => {
        return {
            ...formData,
            // 1. Chuẩn hóa Mã sự kiện: Viết hoa toàn bộ, bỏ khoảng trắng thừa
            event_code: (formData.event_code || "").trim().toUpperCase(),

            // 2. Chuẩn hóa Diễn giải: Trim khoảng trắng đầu cuối
            event_description: (formData.event_description || "").trim(),

            // 3. Đảm bảo ID tài khoản là String (khớp với format JSON mẫu: "debit_account_id": "4")
            // Dù Select option value là string, ta ép kiểu lại cho chắc chắn
            debit_account_id: String(formData.debit_account_id),
            credit_account_id: String(formData.credit_account_id),

            // [MỚI] 4. Đảm bảo trạng thái hoạt động mặc định là true (Hỗ trợ Soft Delete)
            // Mặc dù Service có thể đã xử lý, việc khai báo rõ ở đây giúp code frontend minh bạch hơn
            is_active: true, 
        };
      },

      onSuccess: () => {
         // Có thể log tracking analytics tại đây nếu cần
         console.log("Đã tạo xong cấu hình định khoản mới");
      }
    }
  );

  return (
    <PageContainer title="Thêm mới quy tắc định khoản">
      <PostingRulesForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        // Truyền trạng thái submitting để Form disable nút submit (tránh spam click)
        isLoading={submitting} 
      />
    </PageContainer>
  );
}