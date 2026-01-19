// apps/frontend/erp-portal/src/modules/supply-chain/pages/BinRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import BinTable from "../../components/layouts/BinTable";
import { binService } from "../../services/bin.service";
import { warehouseService } from "../../services/warehouse.service"; // Cần service này để lấy tên kho
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import "../../../../shared/styles/document.css";

export default function BinRestore() {
  const navigate = useNavigate();
  
  // 1. Sử dụng hook Restore Resource
  // Hook này tự động gọi binService.getAll({ includeDeleted: true }) 
  const { 
    data, loading, page, setPage, totalPages, handleRestore, handleDestroy, goBack 
  } = useRestoreResource(
    binService, 
    "id",           // Khóa chính
    "vị trí kho"    // Tên resource dùng cho thông báo
  );

  // 2. Fetch danh sách kho để truyền vào Table (để map ID -> Name)
  // Dùng useAsyncData để tải danh sách kho độc lập
  const { data: warehouses } = useAsyncData(warehouseService.getAll);

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu thùng rác...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Vị trí kho đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <BinTable
        data={data}
        warehouses={warehouses} // Truyền danh sách kho vào để hiển thị tên
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        
        // Điều hướng khi bấm xem chi tiết
        onView={(item) => navigate(`/supply-chain/vi-tri-kho/${item.id}`)}
        
        // Disable nút sửa/xóa mặc định
        onEdit={null}
        onDelete={null}
        
        // Render nút Khôi phục và Xóa vĩnh viễn
        renderExtraActions={(item) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button 
                title="Khôi phục vị trí này" 
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