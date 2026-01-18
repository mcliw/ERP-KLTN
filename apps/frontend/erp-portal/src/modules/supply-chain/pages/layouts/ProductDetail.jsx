// apps/frontend/erp-portal/src/modules/spply-chain/pages/layouts/ProductDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { productService } from "../../services/product.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import { useAuthStore } from "../../../../auth/auth.store";
// Giả định bạn đã định nghĩa permission tương ứng
// import { INVENTORY_PERMISSIONS } from "../../../../shared/permissions/inventory.permissions"; 
import { hasPermission } from "../../../../shared/utils/permission";
import { 
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton 
} from "../../../../shared/components/DetailLayout";
import "../styles/detail.css"; // Reuse CSS của Detail

/* ==============================
 * Helpers / Maps
 * ============================== */
const PRODUCT_TYPE_MAP = {
  trading_goods: "Hàng hóa kinh doanh",
  company_asset: "Tài sản công ty",
};

export default function ProductDetail() {
  // URL: /inventory/products/:id
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  
  // Logic quyền hạn (Giả lập)
  // const canEdit = hasPermission(user?.role, INVENTORY_PERMISSIONS.PRODUCT_UPDATE);
  const canEdit = true; 

  // 1. Fetch Product Info (Service mặc định enrich=true để lấy category_name)
  const { data: product, loading } = useFetchDetail(productService.getById, id);

  if (loading) return <div className="p-6 text-center text-gray-500">Đang tải dữ liệu sản phẩm...</div>;
  if (!product) return <div className="p-6 text-center text-red-500">Không tìm thấy sản phẩm</div>;

  return (
    <div className="main-detail">
      {/* === Header === */}
      <DetailHeader 
        title="Chi tiết sản phẩm"
        onBack={() => navigate("/inventory/products")}
        actions={canEdit && (
          <EditButton onClick={() => navigate(`/inventory/products/${id}/edit`)} />
        )}
      />

      {/* === Top Section (Summary) === */}
      <DetailTop 
        title={product.product_name}
        subtitle={product.sku} // Hiển thị SKU dưới tên
        // Product không có status enum như Department, ta có thể hiển thị Loại SP
        status={PRODUCT_TYPE_MAP[product.product_type] || product.product_type}
        // Có thể custom màu sắc badge status dựa trên logic tồn kho nếu muốn
      />

      <div className="detail-content-wrapper" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* === Left Column: Text Info === */}
        <div style={{ flex: 2, minWidth: '300px' }}>
          
          <DetailSection title="Thông tin chung">
            <DetailGrid>
              <DetailItem label="Mã SKU" value={product.sku} copyable />
              <DetailItem label="Tên sản phẩm" value={product.product_name} />
              <DetailItem label="Danh mục" value={product.category_name || "—"} />
              <DetailItem label="Thương hiệu" value={product.brand || "—"} />
              <DetailItem label="Loại sản phẩm" value={PRODUCT_TYPE_MAP[product.product_type] || "—"} />
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Thông tin kho & Kỹ thuật">
            <DetailGrid>
              <DetailItem label="Đơn vị tính" value={product.unit_of_measure || "—"} />
              <DetailItem 
                label="Bảo hành" 
                value={product.warranty_months ? `${product.warranty_months} tháng` : "Không bảo hành"} 
              />
              <DetailItem label="Tồn kho tối thiểu (Min)" value={product.min_stock_level} />
              
              {/* Nếu API trả về tồn kho hiện tại */}
              {product.current_stock !== undefined && (
                 <DetailItem label="Tồn kho hiện tại" value={product.current_stock} />
              )}
            </DetailGrid>
          </DetailSection>

          <DetailSection title="Lịch sử hệ thống">
            <DetailGrid>
              <DetailItem label="Ngày tạo" value={formatDate(product.created_at)} />
              {/* Nếu có updated_at */}
              {product.updated_at && (
                <DetailItem label="Cập nhật lần cuối" value={formatDate(product.updated_at)} />
              )}
            </DetailGrid>
          </DetailSection>
        </div>

        {/* === Right Column: Image & Visuals === */}
        <div style={{ flex: 1, minWidth: '250px' }}>
          <DetailSection title="Hình ảnh sản phẩm">
            <div className="product-image-container" style={{ 
              border: '1px solid #eee', 
              borderRadius: '8px', 
              padding: '10px',
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: '#fff'
            }}>
              {product.image_url ? (
                <img 
                  
                  src={product.image_url} 
                  alt={product.product_name} 
                  style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = "https://via.placeholder.com/300x300?text=No+Image";
                  }}
                />
              ) : (
                <div style={{ 
                  width: '100%', 
                  height: '200px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#ccc',
                  background: '#f9f9f9'
                }}>
                  Chưa có hình ảnh
                </div>
              )}
            </div>
          </DetailSection>

          {/* Ví dụ: Có thể thêm QR Code ở đây nếu hệ thống hỗ trợ in tem */}
          <DetailSection title="Mã vạch / QR Code">
             <div className="text-center py-4 text-sm text-gray-500">
                (Tính năng in tem đang phát triển)
             </div>
          </DetailSection>
        </div>

      </div>
    </div>
  );
}