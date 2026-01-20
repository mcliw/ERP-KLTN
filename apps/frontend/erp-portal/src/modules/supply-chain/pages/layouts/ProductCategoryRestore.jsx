// apps/frontend/erp-portal/src/modules/supply-chain/pages/ProductCategoryRestore.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import ProductCategoryTable from "../../components/layouts/ProductCategoryTable";
import { productCategoryService } from "../../services/productCategory.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../../../../shared/styles/document.css";

export default function ProductCategoryRestore() {
  const navigate = useNavigate();
  
  // State để lưu map ID -> Name phục vụ hiển thị cột "Danh mục cha"
  const [categoryMap, setCategoryMap] = useState({});

  // 1. Sử dụng hook Restore Resource
  const { 
    data, loading, page, setPage, totalPages, handleRestore, handleDestroy, goBack 
  } = useRestoreResource(
    productCategoryService, 
    "id", // Khóa chính là 'id' thay vì 'code'
    "danh mục sản phẩm"
  );

  // 2. Load danh sách danh mục (bao gồm cả đã xóa) để tạo Map hiển thị tên cha
  useEffect(() => {
    let mounted = true;
    const fetchMap = async () => {
      try {
        // Lấy tất cả để map được cả những cha đã bị xóa
        const allCats = await productCategoryService.getAll({ includeDeleted: true });
        if (mounted) {
          const map = {};
          allCats.forEach(cat => {
            // Chuẩn hóa key giống logic trong Table (upper case string)
            map[String(cat.id).toUpperCase()] = cat.name;
          });
          setCategoryMap(map);
        }
      } catch (err) {
        console.error("Failed to load category map", err);
      }
    };
    fetchMap();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Danh mục sản phẩm đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <ProductCategoryTable
        data={data}
        categoryMap={categoryMap} // Truyền map vào để hiển thị tên cha
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        
        // Điều hướng khi bấm xem chi tiết
        onView={(item) => navigate(`/supply-chain/danh-muc-san-pham-tai-san/${item.id}`)}
        
        // Disable nút sửa/xóa thường, chỉ dùng renderExtraActions
        onEdit={null}
        onDelete={null}
        
        // Render nút Khôi phục và Xóa vĩnh viễn
        renderExtraActions={(item) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button 
                title="Khôi phục" 
                className="action-btn restore-btn"
                onClick={() => handleRestore(item)}
            >
              <FaUndo />
            </button>
            
            <button 
                title="Xoá vĩnh viễn" 
                className="action-btn destroy-btn"
                onClick={() => handleDestroy(item)} 
                style={{ color: "#dc2626" }}
            >
              <FaTrash />
            </button>
          </div>
        )}
      />
    </div>
  );
}