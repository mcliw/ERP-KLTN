// apps/frontend/erp-portal/src/modules/finance/pages/FaAccountEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FaAccountForm from "../../components/layouts/FaAccountForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { faAccountService } from "../../services/faAccount.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function FaAccountEdit() {
  // JSON data dùng 'id' làm khóa chính, URL sẽ là /finance/he-thong-tai-khoan/:id
  const { id } = useParams();
  const navigate = useNavigate();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Tài chính", link: "/finance" },
    { label: "Hệ thống tài khoản", link: "/finance/he-thong-tai-khoan" },
    { label: `Cập nhật: ${id}`, active: true },
  ], [id]);

  // 2. Định nghĩa các hàm tương tác Service
  const fetcher = useCallback((resourceId) => faAccountService.getById(resourceId), []);
  const updater = useCallback((resourceId, data) => faAccountService.update(resourceId, data), []);

  // 3. Sử dụng Hook chuẩn hóa
  const { 
    data: account, 
    loading, 
    submitting, 
    isNotFound, 
    // isDeleted trong hook mẫu thường check field 'deletedAt'. 
    // Với kế toán dùng 'is_active', ta sẽ tự check thủ công bên dưới.
    handleUpdate, 
    handleCancel 
  } = useEditResource({
    id, 
    fetcher,
    updater,
    successPath: "/finance/he-thong-tai-khoan",
    options: {
      resourceName: "tài khoản kế toán",
      
      // Xử lý payload trước khi gửi API
      transformPayload: (formData) => {
        const { 
          // Loại bỏ các trường hệ thống không nên update thủ công
          id, 
          created_at, 
          updated_at, 
          // Lấy các trường còn lại
          ...rest 
        } = formData;
        
        return {
           ...rest,
           // Đảm bảo parent_account_id là null nếu rỗng hoặc số nếu có giá trị
           parent_account_id: rest.parent_account_id ? Number(rest.parent_account_id) : null,
           // Đảm bảo account_code viết hoa
           account_code: (rest.account_code || "").trim().toUpperCase(),
           // Đảm bảo boolean
           is_active: String(rest.is_active) === "true" || rest.is_active === true,
        };
      }
    }
  });

  // Check trạng thái inactive (tương đương soft deleted trong ví dụ mẫu)
  const isInactive = account && account.is_active === false;

  // 4. Render các trạng thái đặc biệt
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin tài khoản...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy tài khoản với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // Nếu tài khoản đang ngừng hoạt động, cảnh báo người dùng
  if (isInactive) {
    return (
      <PageContainer title="Tài khoản ngừng hoạt động" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Tài khoản <strong>{account?.account_code} - {account?.account_name}</strong> đang ở trạng thái ngừng hoạt động.
          <br/>
          Bạn có muốn khôi phục lại tài khoản này để chỉnh sửa không?
        </div>
        <div className="mt-3 gap-2 d-flex">
            <button className="btn btn-primary" onClick={async () => {
                // Logic khôi phục nhanh tại chỗ (Optional)
                await faAccountService.restore(id);
                window.location.reload(); 
            }}>
                Khôi phục ngay
            </button>
            <button className="btn btn-secondary" onClick={handleCancel}>Quay lại danh sách</button>
        </div>
      </PageContainer>
    );
  }

  // 5. Render Form chính
  return (
    <PageContainer 
      // Hiển thị tiêu đề động: Cập nhật: 111 - Tiền mặt
      title={`Cập nhật: ${account?.account_code || ''} - ${account?.account_name || id}`} 
      breadcrumbs={breadcrumbs}
    >
      <FaAccountForm
        mode="edit"
        initialData={account}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        // Truyền trạng thái loading để disable nút submit
        isLoading={submitting}
      />
    </PageContainer>
  );
}