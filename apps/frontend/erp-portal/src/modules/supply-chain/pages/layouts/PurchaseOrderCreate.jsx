// apps/frontend/erp-portal/src/modules/supply-chain/pages/PurchaseOrderCreate.jsx

import React from "react";
import PurchaseOrderForm from "../../components/layouts/PurchaseOrderForm";
import { purchaseOrderService } from "../../services/purchaseOrder.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function PurchaseOrderCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => purchaseOrderService.create(data),
    "/supply-chain/don-mua-hang", // Đường dẫn redirect sau khi tạo thành công
    {
      resourceName: "đơn mua hàng",
      
      // --- XỬ LÝ DỮ LIỆU TRƯỚC KHI GỬI API ---
      transformPayload: (formData) => {
        // formData ở đây là dữ liệu thô lấy từ Form (bao gồm cả items đã được auto-fill)
        return {
          ...formData,
          
          // 1. Ép kiểu dữ liệu Header cho an toàn
          po_code: formData.po_code,
          quotation_id: String(formData.quotation_id),
          supplier_id: String(formData.supplier_id),
          
          total_amount: Number(formData.total_amount || 0),
          tax_amount: Number(formData.tax_amount || 0),
          discount_amount: Number(formData.discount_amount || 0),
          
          order_date: formData.order_date || new Date().toISOString().split('T')[0],
          expected_delivery_date: formData.expected_delivery_date,
          
          // 2. Set trạng thái mặc định cho đơn mới
          status: "PENDING",
          approved_by: null,
          createdAt: new Date().toISOString(),

          // 3. [QUAN TRỌNG] Xử lý mảng Items
          // Đảm bảo gửi mảng rỗng [] nếu không có sản phẩm, tránh lỗi API
          items: Array.isArray(formData.items) ? formData.items.map(item => ({
              product_id: item.product_id,
              quantity_ordered: Number(item.quantity_ordered), // Đảm bảo số
              unit_price: Number(item.unit_price),             // Đảm bảo số
              total_line_amount: Number(item.total_line_amount)
          })) : []
        };
      },
    }
  );

  return (
    <PageContainer title="Lập Đơn Mua Hàng (Purchase Order)">
      <PurchaseOrderForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting} 
      />
    </PageContainer>
  );
}