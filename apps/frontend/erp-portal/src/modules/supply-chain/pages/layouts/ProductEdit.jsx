import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import ProductForm from "../../components/layouts/ProductForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { productService } from "../../services/product.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function ProductEdit() {
  const { id } = useParams();
  
  const breadcrumbs = useMemo(() => [
    { label: "Supply Chain", link: "/supply-chain" },
    { label: "Sản phẩm", link: "/supply-chain/san-pham-tai-san" },
    { label: "Cập nhật", active: true },
  ], []);

  const { data, loading, submitting, isNotFound, handleUpdate, handleCancel } = useEditResource({
    id, fetcher: useCallback((i) => productService.getById(i), []),
    updater: useCallback((i, d) => productService.update(i, d), []),
    successPath: "/supply-chain/san-pham-tai-san",
    options: { resourceName: "sản phẩm" }
  });

  if (loading) return <div>Loading...</div>;
  if (isNotFound) return <div>Không tìm thấy sản phẩm</div>;

  return (
    <PageContainer title={`Cập nhật: ${data.code}`} breadcrumbs={breadcrumbs}>
      <ProductForm mode="edit" initialData={data} onSubmit={handleUpdate} onCancel={handleCancel} disabled={submitting} />
    </PageContainer>
  );
}