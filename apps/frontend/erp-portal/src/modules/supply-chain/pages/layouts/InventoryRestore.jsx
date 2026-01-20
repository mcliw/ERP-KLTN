// apps/frontend/erp-portal/src/modules/supply-chain/pages/InventoryRestore.jsx

import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import InventoryTable from "../../components/layouts/InventoryTable";
import { inventoryService } from "../../services/inventory.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../../../../shared/styles/document.css";
import { warehouseService } from "../../services/warehouse.service";
import { binService } from "../../services/bin.service";
import { productService } from "../../services/product.service";

export default function InventoryRestore() {
  const navigate = useNavigate();

  // 1. State lưu dữ liệu tham chiếu (Để hiển thị tên thay vì ID trong bảng)
  const [refData, setRefData] = useState({
    warehouses: [],
    bins: [],
    products: []
  });

  // 2. Fetch dữ liệu tham chiếu
  useEffect(() => {
    const fetchRefs = async () => {
      try {
        // --- MỚI ---
        // Lấy cả data đã xóa (includeDeleted: true) để hiển thị tên chính xác cho các item lịch sử
        const [warehouses, bins, products] = await Promise.all([
          warehouseService.getAll({ includeDeleted: true }),
          binService.getAll({ includeDeleted: true }),
          productService.getAll({ includeDeleted: true }),
        ]);
        setRefData({ warehouses, bins, products });
      } catch (error) {
        console.error("Lỗi tải dữ liệu tham chiếu:", error);
      }
    };
    fetchRefs();
  }, []);

  // 3. Sử dụng hook Restore Resource
  // Hook này sẽ tự động gọi inventoryService.getAll({ includeDeleted: true })
  const { 
    data, loading, page, setPage, totalPages, handleRestore, handleDestroy, goBack 
  } = useRestoreResource(
    inventoryService, 
    "id",             
    "dữ liệu tồn kho" 
  );

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu thùng rác...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Dữ liệu tồn kho đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <InventoryTable
        data={data}
        // Truyền dữ liệu tham chiếu xuống Table để hiển thị tên đúng
        warehouses={refData.warehouses}
        bins={refData.bins}
        products={refData.products}

        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        
        // Vẫn cho phép xem chi tiết bản ghi đã xóa (Readonly)
        onView={(item) => navigate(`/supply-chain/ton-kho/${item.id}`)}
        
        // Disable nút sửa/xóa thường của Table
        onEdit={null}
        onDelete={null}
        
        // Render nút hành động đặc biệt cho trang Restore
        renderExtraActions={(item) => (
          <div style={{ display: "flex", gap: 6 }}>
            {/* Nút Khôi phục */}
            <button 
                title="Khôi phục lại kho" 
                className="action-btn restore-btn"
                onClick={() => handleRestore(item)}
            >
              <FaUndo />
            </button>
            
            {/* Nút Xóa vĩnh viễn */}
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