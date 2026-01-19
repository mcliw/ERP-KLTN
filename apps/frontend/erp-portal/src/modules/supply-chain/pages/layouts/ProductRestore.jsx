// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/ProductRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import ProductTable from "../../components/layouts/ProductTable";
import { productService } from "../../services/product.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../styles/document.css"; // Sử dụng chung style của layout document

export default function ProductRestore() {
  const navigate = useNavigate();

  // Sử dụng hook useRestoreResource để xử lý logic lấy dữ liệu đã xoá, khôi phục và xoá vĩnh viễn
  const {
    data,
    loading,
    page,
    setPage,
    totalPages,
    handleRestore,
    handleDestroy, // Xoá vĩnh viễn (Hard delete)
    goBack,
  } = useRestoreResource(
    productService, 
    "product_id", // Khóa định danh của sản phẩm trong DB
    "sản phẩm"    // Tên resource hiển thị trong thông báo
  );

  if (loading) return <div style={{ padding: 20, textAlign: "center" }}>Đang tải dữ liệu thùng rác...</div>;

  return (
    <div className="main-document">
      {/* === Header === */}
      <div className="page-header">
        <h2>Sản phẩm đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại danh sách</span>
        </button>
      </div>

      {/* === Table === */}
      <ProductTable
        data={data}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        
        // Điều hướng đến trang chi tiết nếu click (vẫn xem được chi tiết dù đã xoá)
        onView={(d) => navigate(`/inventory/products/${d.product_id}`)}
        
        // Tắt các action sửa/xoá thông thường
        onEdit={null}
        onDelete={null}
        
        // Render nút thao tác riêng cho trang Restore
        renderExtraActions={(d) => (
          <div style={{ display: "flex", gap: 10, justifyContent: 'center' }}>
            <button 
              title="Khôi phục" 
              onClick={(e) => {
                e.stopPropagation(); // Ngăn chặn onRowClick
                handleRestore(d);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              <FaUndo />
            </button>
            
            <button
              title="Xoá vĩnh viễn"
              onClick={(e) => {
                e.stopPropagation();
                handleDestroy(d);
              }}
              style={{ color: "#dc2626" }}
              className="hover:text-red-800"
            >
              <FaTrash />
            </button>
          </div>
        )}
      />
    </div>
  );
}