import ProductForm from "../../components/layouts/ProductForm";
import { productService } from "../../services/product.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function ProductCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => productService.create(data),
    "/supply-chain/san-pham-tai-san",
    { resourceName: "sản phẩm" }
  );

  return (
    <PageContainer title="Thêm mới sản phẩm">
      <ProductForm mode="create" onSubmit={handleSubmit} onCancel={handleCancel} disabled={submitting} />
    </PageContainer>
  );
}