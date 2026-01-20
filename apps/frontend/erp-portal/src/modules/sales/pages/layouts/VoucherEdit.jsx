// apps/frontend/erp-portal/src/modules/sales/pages/VoucherEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import VoucherForm from "../../components/layouts/VoucherForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { voucherService } from "../../services/voucher.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function VoucherEdit() {
  // Lấy ID từ URL
  const { id } = useParams();

  // 1. Breadcrumbs động cho Module sales/voucher
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Sales", link: "/sales" },
    { label: "Mã giảm giá", link: "/sales/ma-giam-gia" },
    { label: `Cập nhật: ${id}`, active: true },
  ], [id]);

  // 2. Định nghĩa các hàm tương tác Service
  const fetcher = useCallback((resourceId) => voucherService.getById(resourceId), []);
  
  const updater = useCallback((resourceId, data) => voucherService.update(resourceId, data), []);

  // 3. Sử dụng Hook chuẩn hóa để quản lý trạng thái Edit
  const { 
    data: voucher, 
    loading, 
    submitting, 
    isNotFound, 
    isDeleted, 
    handleUpdate, 
    handleCancel 
  } = useEditResource({
    id, 
    fetcher,
    updater,
    successPath: "/sales/ma-giam-gia",
    options: {
      resourceName: "mã giảm giá",
      // Xử lý dữ liệu trước khi gửi API (Re-structure from Flat Form to Nested DTO)
      transformPayload: (formData) => {
        const { 
          id: _id, 
          created_at, 
          updated_at, 
          deleted_at,
          ...rest 
        } = formData;
        
        // Convert các trường số và chuẩn hóa
        const discountValue = Number(rest.discount_value);
        const minOrder = rest.min_order_amount ? Number(rest.min_order_amount) : null;
        const maxDiscount = rest.max_discount_amount ? Number(rest.max_discount_amount) : null;
        const isActive = rest.status === "ACTIVE";

        return {
          // Fields bảng Voucher
          discount_type: rest.discount_type,
          discount_value: discountValue,
          is_active: isActive,
          
          // Fields bảng Voucher Detail (Code)
          voucher_details: [
            {
              code: rest.code, 
              is_active: isActive
            }
          ],

          // Fields bảng Voucher Constraint (Conditions)
          voucher_constraints: [
            {
              min_order_amount: minOrder,
              max_discount_amount: maxDiscount
            }
          ]
        };
      }
    }
  });

  // Helper để lấy tên hiển thị (Mã code)
  const displayTitle = useMemo(() => {
    if (!voucher) return id;
    // Lấy mã code từ details nếu có, không thì fallback về ID
    return voucher.voucher_details?.[0]?.code || voucher.id;
  }, [voucher, id]);

  // 4. Render trạng thái Đang tải
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin mã giảm giá...</div>
      </PageContainer>
    );
  }

  // 5. Render trạng thái Không tìm thấy (404)
  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy mã giảm giá với ID hệ thống: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 6. Render trạng thái Đã bị xóa (Soft-deleted)
  if (isDeleted) {
    return (
      <PageContainer title="Voucher đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Mã giảm giá <strong>{displayTitle}</strong> hiện đang nằm trong thùng rác hoặc đã bị hủy. 
          Bạn cần khôi phục dữ liệu trước khi có thể chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 7. Render Form chỉnh sửa chính
  return (
    <PageContainer 
      title={`Cập nhật: ${displayTitle}`} 
      breadcrumbs={breadcrumbs}
    >
      <VoucherForm
        mode="edit"
        initialData={voucher}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}