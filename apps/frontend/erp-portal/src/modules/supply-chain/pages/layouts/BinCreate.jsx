// apps/frontend/erp-portal/src/modules/supply-chain/pages/BinCreate.jsx

import { useMemo } from "react";
import BinForm from "../../components/layouts/BinForm";
import { binService } from "../../services/bin.service";
import { warehouseService } from "../../services/warehouse.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import PageContainer from "../../../../shared/components/PageContainer";

export default function BinCreate() {
  // 1. Chuẩn bị dữ liệu: Lấy danh sách kho để hiển thị trong Select box
  const { data: warehouses, loading: loadingWarehouses } = useAsyncData(warehouseService.getAll);

  // Map dữ liệu kho sang format { value, label } cho FormSelect
  const warehouseOptions = useMemo(() => {
    if (!warehouses) return [];
    return warehouses.map((w) => ({
      value: w.id,
      label: w.name,
    }));
  }, [warehouses]);

  // 2. Logic tạo mới resource
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    // a. Hàm gọi API
    (data) => binService.create(data),
    
    // b. Đường dẫn quay về sau khi tạo thành công
    "/supply-chain/vi-tri-kho", 
    
    // c. Cấu hình thêm
    {
      resourceName: "vị trí kho",
      
      // Transform Payload: Đảm bảo dữ liệu chuẩn trước khi gửi
      transformPayload: (formData) => {
        return {
            ...formData,
            // Standardize code
            code: formData.code ? formData.code.toUpperCase() : "",
            // Ép kiểu số cho FK và Capacity (dù Form đã xử lý, check lại cho an toàn)
            warehouse_id: Number(formData.warehouse_id),
            max_capacity: Number(formData.max_capacity) || 0,
            // Xử lý description rỗng
            description: formData.description || null
        };
      },

      onSuccess: () => {
         console.log("Đã tạo xong vị trí kho mới");
      }
    }
  );

  // Hiển thị trạng thái loading khi đang tải danh sách kho
  if (loadingWarehouses) {
    return <div className="p-4">Đang tải danh sách kho hàng...</div>;
  }

  return (
    <PageContainer title="Thêm mới vị trí kho">
      <BinForm
        mode="create"
        // Truyền danh sách kho vào Form
        warehouseOptions={warehouseOptions}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        // Disabled form khi đang submit
        disabled={submitting} 
      />
    </PageContainer>
  );
}