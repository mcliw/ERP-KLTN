// apps/frontend/erp-portal/src/modules/finance/pages/PaymentSlipEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import PaymentSlipForm from "../../components/layouts/PaymentSlipForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { paymentSlipService } from "../../services/paymentSlip.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function PaymentSlipEdit() {
  const { id } = useParams();

  // 1. Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Mua hàng", link: "/finance" },
    { label: "Phiếu chi", link: "/finance/phieu-chi" },
    { label: `Chi tiết: ${id}`, active: true },
  ], [id]);

  // 2. Service Wrappers
  const fetcher = useCallback((resourceId) => paymentSlipService.getById(resourceId), []);
  const updater = useCallback((resourceId, data) => paymentSlipService.update(resourceId, data), []);

  // 3. Hook quản lý logic Edit
  const { 
    data: paymentSlip, 
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
    successPath: "/finance/phieu-chi",
    options: {
      resourceName: "phiếu chi",
      
      // Xử lý dữ liệu form trước khi gửi API Update
      transformPayload: (formData) => {
        const { 
            id: _id, // Không gửi lại ID trong body
            created_at, updated_at, deleted_at, 
            supplier_name, purchase_orders_info, // Loại bỏ các trường enrich hiển thị
            ...rest 
        } = formData;

        return {
          ...rest,
          amount: Number(rest.amount),
          description: rest.description?.trim(),
          bank_account_number: rest.bank_account_number?.trim(),
          
          // Map lại trường Form -> API Field
          partner_id: rest.supplier_id,
          order_reference_ids: rest.purchase_order_ids,
        };
      }
    }
  });

  // 4. Chuẩn hóa dữ liệu từ API về định dạng Form
  // API dùng 'partner_id', Form dùng 'supplier_id'
  const transformedData = useMemo(() => {
      if (!paymentSlip) return null;
      return {
          ...paymentSlip,
          supplier_id: paymentSlip.partner_id,
          purchase_order_ids: paymentSlip.order_reference_ids || [],
      };
  }, [paymentSlip]);

  // 5. Các trạng thái Loading / Error
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin phiếu chi...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy phiếu chi: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Phiếu chi đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Phiếu chi <strong>{id}</strong> đã bị xóa. Vui lòng khôi phục để chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 6. Render Form
  return (
    <PageContainer 
      title={`Chi tiết phiếu chi: ${id}`} 
      breadcrumbs={breadcrumbs}
    >
      <PaymentSlipForm
        mode="edit"
        initialData={transformedData} // Truyền dữ liệu đã map
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
        // Form tự động fetch danh sách PO dựa trên supplier_id trong initialData
      />
    </PageContainer>
  );
}