// apps/frontend/erp-portal/src/modules/supply-chain/pages/WarehouseRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import WarehouseTable from "../../components/layouts/WarehouseTable";
import { warehouseService } from "../../services/warehouse.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../../../../shared/styles/document.css";

export default function WarehouseRestore() {
  const navigate = useNavigate();
  
  // 1. Sử dụng hook Restore Resource
  // Hook này tự động gọi service.getAll({ includeDeleted: true }) 
  // và lọc ra các item có deletedAt
  const { 
    data, loading, page, setPage, totalPages, handleRestore, handleDestroy, goBack 
  } = useRestoreResource(
    warehouseService, 
    "id",       // Khóa chính
    "kho hàng"  // Tên resource dùng cho thông báo
  );

  // Không cần useEffect load map như Category vì Warehouse phẳng (không có cha-con)

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu thùng rác...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Kho hàng đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <WarehouseTable
        data={data}
        // Không cần truyền categoryMap
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        
        // Điều hướng khi bấm xem chi tiết (vẫn xem được dù đã xóa)
        onView={(item) => navigate(`/supply-chain/kho-hang/${item.id}`)}
        
        // Disable nút sửa/xóa thường của Table, chỉ dùng renderExtraActions
        onEdit={null}
        onDelete={null}
        
        // Render nút Khôi phục và Xóa vĩnh viễn
        renderExtraActions={(item) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button 
                title="Khôi phục kho này" 
                className="action-btn restore-btn"
                onClick={() => handleRestore(item)}
            >
              <FaUndo />
            </button>
            
            <button 
                title="Xoá vĩnh viễn (Không thể hoàn tác)" 
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