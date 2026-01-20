// apps/frontend/erp-portal/src/modules/supply-chain/pages/InventoryCreate.jsx

import { useMemo, useCallback } from "react";
import InventoryForm from "../../components/layouts/InventoryForm";
import { inventoryService } from "../../services/inventory.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData"; // Hook tải dữ liệu
import PageContainer from "../../../../shared/components/PageContainer";
import { warehouseService } from "../../services/warehouse.service";
import { binService } from "../../services/bin.service";
import { productService } from "../../services/product.service";

export default function InventoryCreate() {
  /* =========================================
   * 1. Tải dữ liệu tham chiếu (Reference Data)
   * ========================================= */
  // Cần tải danh sách Kho, Vị trí và Sản phẩm để hiển thị trong Select box
  const fetchRefData = useCallback(async () => {
  // --- MỚI ---
  // Gọi service thay vì fetch thủ công
    const [warehouses, bins, products] = await Promise.all([
      warehouseService.getAll(),
      binService.getAll(),
      productService.getAll()
    ]);
    return { warehouses, bins, products };
  }, []);

  const { data: refData, loading: loadingRef } = useAsyncData(fetchRefData);

  // Chuẩn bị options cho Form
  const warehouseOptions = useMemo(() => refData?.warehouses || [], [refData]);
  const binOptions = useMemo(() => refData?.bins || [], [refData]);
  const productOptions = useMemo(() => refData?.products || [], [refData]);

  /* =========================================
   * 2. Logic tạo mới (Create Logic)
   * ========================================= */
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    // Hàm gọi API service
    (data) => inventoryService.create(data),

    // Đường dẫn quay về sau khi tạo thành công
    "/supply-chain/ton-kho",

    // Cấu hình thêm
    {
      resourceName: "dữ liệu tồn kho",

      // Transform Payload: Đảm bảo dữ liệu gửi lên là Number đúng chuẩn
      transformPayload: (formData) => {
        return {
          ...formData,
          // Ép kiểu ID về số nguyên (vì value của select HTML thường là string)
          warehouse_id: Number(formData.warehouse_id),
          bin_id: formData.bin_id,
          product_id: formData.product_id,
          
          // Số lượng
          quantity_on_hand: Number(formData.quantity_on_hand),
          quantity_allocated: Number(formData.quantity_allocated || 0),

          notes: formData.notes || "",
          
          // quantity_available sẽ được tính ở Service, không cần gửi (hoặc gửi tùy logic BE)
        };
      },

      onSuccess: () => {
        console.log("Đã khởi tạo tồn kho (Initial Stock) thành công");
      },
    }
  );

  // Hiển thị loading khi đang tải danh sách tham chiếu
  if (loadingRef) {
    return <div style={{ padding: 20 }}>Đang tải dữ liệu tham chiếu...</div>;
  }

  return (
    <PageContainer title="Nhập kho ban đầu (Initial Stock)">
      <InventoryForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        
        // Truyền options danh sách vào Form
        warehouseOptions={warehouseOptions}
        binOptions={binOptions}
        productOptions={productOptions}
        
        // Disable form khi đang submit
        disabled={submitting}
      />
    </PageContainer>
  );
}