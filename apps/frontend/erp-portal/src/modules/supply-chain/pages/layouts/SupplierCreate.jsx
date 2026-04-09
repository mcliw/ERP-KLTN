// apps/frontend/erp-portal/src/modules/supply-chain/pages/resources/SupplierCreate.jsx

import SupplierForm from "../../components/layouts/SupplierForm";
import { supplierService } from "../../services/supplier.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function SupplierCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => supplierService.create(data),
    "/supply-chain/nha-cung-cap",
    {
      resourceName: "nhà cung cấp",
      
      transformPayload: (formData) => {
        // Nếu có trường nào chỉ dùng cho UI (như preview ảnh) thì loại bỏ ở đây
        // Hiện tại SupplierForm đã xử lý khá sạch, ta trả về nguyên bản
        return formData;
      },

      onSuccess: () => {
         console.log("Đã tạo xong nhà cung cấp mới");
      }
    }
  );

  return (
    <PageContainer title="Thêm mới nhà cung cấp">
      <SupplierForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting}
        checkCodeExists={supplierService.checkCodeExists.bind(supplierService)}
      />
    </PageContainer>
  );
}