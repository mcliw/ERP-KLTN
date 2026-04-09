import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { productService } from "../../services/product.service";
import { productCategoryService } from "../../services/productCategory.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton } from "../../../../shared/components/DetailLayout";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: product, loading } = useFetchDetail(productService.getById, id);
  const [catName, setCatName] = useState("...");

  // Lấy tên danh mục khi product đã load xong
  useEffect(() => {
    if(product?.categoryId) {
        productCategoryService.getById(product.categoryId).then(c => setCatName(c ? c.name : "Không xác định"));
    }
  }, [product]);

  if (loading) return <div>Loading...</div>;
  if (!product) return <div>Not found</div>;

  return (
    <div className="main-detail">
      <DetailHeader title="Chi tiết sản phẩm" onBack={() => navigate("/supply-chain/san-pham-tai-san")} 
        actions={!product.deletedAt && <EditButton onClick={() => navigate(`/supply-chain/san-pham-tai-san/${id}/chinh-sua`)} />} 
      />
      
      <DetailTop title={product.name} subtitle={`${product.code} • ${product.type}`} status={product.status} 
        avatarUrl={product.image} isDeleted={!!product.deletedAt} 
      />

      <DetailSection title="Thông tin chung">
        <DetailGrid>
            <DetailItem label="Mã SKU" value={product.code} />
            <DetailItem label="Danh mục" value={catName} />
            <DetailItem label="Thương hiệu" value={product.brand} />
            <DetailItem label="Đơn vị tính" value={product.unit} />
        </DetailGrid>
      </DetailSection>
      
      <DetailSection title="Thông tin kho & Bảo hành">
        <DetailGrid>
            <DetailItem label="Tồn tối thiểu" value={product.minStock} />
            <DetailItem label="Bảo hành" value={`${product.warranty} tháng`} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Mô tả">
         <div style={{padding: "10px 0"}}>{product.description || "Chưa có mô tả"}</div>
      </DetailSection>
    </div>
  );
}