// apps/frontend/erp-portal/src/modules/finance/pages/PostingRulesEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import PostingRulesForm from "../../components/layouts/PostingRulesForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { postingRulesService } from "../../services/postingRules.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function PostingRulesEdit() {
  // URL format: /finance/dinh-khoan/:id
  const { id } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Tài chính", link: "/finance" },
    { label: "Cấu hình định khoản", link: "/finance/dinh-khoan" },
    { label: `Cập nhật: ${id}`, active: true },
  ], [id]);

  // 2. Định nghĩa các hàm tương tác Service
  const fetcher = useCallback((resourceId) => postingRulesService.getById(resourceId), []);
  const updater = useCallback((resourceId, data) => postingRulesService.update(resourceId, data), []);

  // 3. Sử dụng Hook chuẩn hóa
  const { 
    data: rule, 
    loading, 
    submitting, 
    isNotFound, 
    handleUpdate, 
    handleCancel 
  } = useEditResource({
    id, 
    fetcher,
    updater,
    successPath: "/finance/dinh-khoan", // Redirect về danh sách sau khi lưu
    options: {
      resourceName: "quy tắc định khoản",
      
      // Xử lý payload trước khi gửi API (PUT)
      transformPayload: (formData) => {
        const { 
          // Loại bỏ các trường ID/System fields không nên update thủ công
          id, 
          rule_id, 
          created_at, // Nếu có
          updated_at, // Nếu có
          // Lấy các trường còn lại
          ...rest 
        } = formData;
        
        return {
           ...rest,
           // 1. Chuẩn hóa Event Code (Mặc dù form disable edit, nhưng vẫn nên sanitize)
           event_code: (rest.event_code || "").trim().toUpperCase(),
           
           // 2. Chuẩn hóa Diễn giải
           event_description: (rest.event_description || "").trim(),

           // 3. Đảm bảo ID tài khoản là String (theo chuẩn JSON mẫu)
           debit_account_id: String(rest.debit_account_id),
           credit_account_id: String(rest.credit_account_id),
        };
      }
    }
  });

  // 4. Render các trạng thái (Loading / Not Found)
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin quy tắc...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy quy tắc định khoản với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 5. Kiểm tra trạng thái Inactive (Đã xóa mềm)
  const isInactive = rule && rule.is_active === false;
  if (isInactive) {
    return (
      <PageContainer title="Quy tắc đã ngừng hoạt động" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Quy tắc <strong>{rule?.event_code}</strong> đang ở trạng thái ngừng hoạt động (Đã xóa).
          <br/>
          Bạn có muốn khôi phục lại để tiếp tục chỉnh sửa không?
        </div>
        <div className="mt-3 gap-2 d-flex">
            {/* Nút Khôi phục nhanh */}
            <button className="btn btn-primary" onClick={async () => {
                try {
                    await postingRulesService.restore(id);
                    // Reload lại trang để lấy dữ liệu mới nhất (is_active = true)
                    window.location.reload(); 
                } catch (error) {
                    console.error("Restore failed", error);
                    alert("Khôi phục thất bại");
                }
            }}>
                Khôi phục ngay
            </button>
            
            <button className="btn btn-secondary" onClick={handleCancel}>
                Quay lại danh sách
            </button>
        </div>
      </PageContainer>
    );
  }

  // 6. Render Form chính (Nếu đang hoạt động)
  return (
    <PageContainer 
      // Hiển thị tiêu đề: Cập nhật: GRN_CONFIRMED - Nhập kho...
      title={`Cập nhật: ${rule?.event_code || ''} - ${rule?.event_description || id}`} 
      breadcrumbs={breadcrumbs}
    >
      <PostingRulesForm
        mode="edit"
        initialData={rule}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        // Truyền trạng thái submitting để Form disable nút submit
        isLoading={submitting}
      />
    </PageContainer>
  );
}