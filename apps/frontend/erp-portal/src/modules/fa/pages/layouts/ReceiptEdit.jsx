// apps/frontend/erp-portal/src/modules/sales/pages/ReceiptEdit.jsx

import { useMemo, useCallback, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ReceiptForm from "../../components/layouts/ReceiptForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { receiptService } from "../../services/receipt.service";
import { customerService } from "../../../sales/services/customer.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";
import { useToast } from "../../../../shared/components/ToastProvider";

export default function ReceiptEdit() {
  const { id } = useParams();
  const toast = useToast();

  // Chỉ cần state customerOptions
  const [customerOptions, setCustomerOptions] = useState([]);

  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Finance", link: "/finance" },
    { label: "Phiếu thu", link: "/finance/phieu-thu" },
    { label: `Chi tiết: ${id}`, active: true },
  ], [id]);

  const fetcher = useCallback((resourceId) => receiptService.getById(resourceId), []);
  const updater = useCallback((resourceId, data) => receiptService.update(resourceId, data), []);

  const { 
    data: receipt, 
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
    successPath: "/finance/phieu-thu",
    options: {
      resourceName: "phiếu thu",
      transformPayload: (formData) => {
        const { id: _id, created_at, updated_at, deleted_at, ...rest } = formData;
        return {
          ...rest,
          amount: Number(rest.amount),
          description: rest.description?.trim(),
        };
      }
    }
  });

  // Chỉ fetch danh sách Khách hàng
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const customers = await customerService.getAll();
        const cOptions = (customers || []).map((c) => ({
          value: c.id,
          label: `${c.full_name} (${c.phone})`,
        }));
        setCustomerOptions(cOptions);
      } catch (error) {
        console.error("Lỗi tải danh sách khách hàng:", error);
        toast.error("Không thể tải danh sách khách hàng");
      }
    };

    fetchCustomers();
  }, [toast]);

  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin phiếu thu...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy phiếu thu: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Phiếu thu đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Phiếu thu <strong>{id}</strong> đã bị xóa. Vui lòng khôi phục để chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      title={`Chi tiết phiếu thu: ${id}`} 
      breadcrumbs={breadcrumbs}
    >
      <ReceiptForm
        mode="edit"
        initialData={receipt}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
        // Chỉ truyền customerOptions, bỏ orderOptions
        customerOptions={customerOptions}
      />
    </PageContainer>
  );
}