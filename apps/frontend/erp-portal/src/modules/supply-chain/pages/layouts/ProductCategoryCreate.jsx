// apps/frontend/erp-portal/src/modules/supply-chain/pages/ProductCategoryCreate.jsx

import ProductCategoryForm from "../../components/layouts/ProductCategoryForm";
import { productCategoryService } from "../../services/productCategory.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function ProductCategoryCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => productCategoryService.create(data),
    "/supply-chain/danh-muc-san-pham-tai-san", // <-- Cập nhật đường dẫn danh sách của bạn ở đây
    {
      resourceName: "danh mục sản phẩm",
      
      transformPayload: (formData) => {
        // Làm sạch dữ liệu nếu cần trước khi gửi API
        // Ví dụ: Đảm bảo parentId là null nếu là chuỗi rỗng
        return {
            ...formData,
            parentId: formData.parentId || null
        };
      },

      onSuccess: () => {
         console.log("Đã tạo xong danh mục mới");
      }
    }
  );

  return (
    <PageContainer title="Thêm mới danh mục sản phẩm">
      <ProductCategoryForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting} // Disable form khi đang gửi request
        // Lưu ý: Không cần truyền checkCodeExists vì ID danh mục thường tự sinh (Auto Increment)
      />
    </PageContainer>
  );
}