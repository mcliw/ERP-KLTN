// apps/frontend/erp-portal/src/modules/sales/pages/ReceiptCreate.jsx

import { useEffect, useState } from "react";
import ReceiptForm from "../../components/layouts/ReceiptForm";
import { receiptService } from "../../services/receipt.service";
import { customerService } from "../../../sales/services/customer.service"
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";
import { useToast } from "../../../../shared/components/ToastProvider";

export default function ReceiptCreate() {
  const toast = useToast();
  // Chỉ giữ lại state cho Khách hàng
  const [customerOptions, setCustomerOptions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => receiptService.create(data),
    "/finance/phieu-thu",
    {
      resourceName: "phiếu thu",
      transformPayload: (formData) => ({
        ...formData,
        id: formData.id?.trim().toUpperCase(),
        amount: Number(formData.amount),
        customer_id: formData.customer_id,
        order_id: formData.order_id,
        description: formData.description?.trim(),
      }),
      onSuccess: () => console.log("Tạo phiếu thu thành công"),
    }
  );

  // Load danh sách Khách hàng để truyền vào Form
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const customers = await customerService.getAll();
        const cOptions = (customers || []).map((c) => ({
          value: c.id,
          label: `${c.full_name} (${c.phone})`,
        }));
        setCustomerOptions(cOptions);
      } catch (error) {
        toast.error("Không thể tải danh sách khách hàng");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [toast]);

  if (loadingData) return <PageContainer title="Đang tải dữ liệu...">Loading...</PageContainer>;

  return (
    <PageContainer title="Lập phiếu thu mới">
      <ReceiptForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        // Chỉ truyền danh sách khách hàng, Form sẽ tự lo việc load đơn hàng
        customerOptions={customerOptions}
        disabled={submitting} 
      />
    </PageContainer>
  );
}