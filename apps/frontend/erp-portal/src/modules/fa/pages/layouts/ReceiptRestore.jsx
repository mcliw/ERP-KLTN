// apps/frontend/erp-portal/src/modules/sales/pages/ReceiptRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import ReceiptTable from "../../components/layouts/ReceiptTable";
import { receiptService } from "../../services/receipt.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";
import { useMemo } from "react"; 

export default function ReceiptRestore() {
  const navigate = useNavigate();
  
  // 1. Dùng useMemo để hàm filter không bị khởi tạo lại gây re-render
  // Lọc ra các phiếu thu đã bị xóa mềm (có deleted_at)
  const receiptDeletedFilter = useMemo(() => (item) => isSoftDeleted(item.deleted_at), []);

  const { 
    data, 
    loading, 
    page, 
    setPage, 
    totalPages, 
    handleRestore, 
    handleDestroy, 
    goBack 
  } = useRestoreResource(
    receiptService, 
    "id",            // Tên trường ID của phiếu thu
    "phiếu thu",     // Tên tài nguyên hiển thị trong thông báo
    receiptDeletedFilter
  );

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Phiếu thu đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <div className={`table-wrapper ${loading ? "loading-fade" : ""}`}>
        {/* Chỉ hiển thị overlay thay vì xóa bỏ Table */}
        {loading && <div className="table-overlay">Đang tải...</div>}
        
        <ReceiptTable
          data={data}
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(p - 1, 1))}
          onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
          
          // Điều hướng khi click xem chi tiết (vẫn xem được dù đã xóa)
          onView={(item) => navigate(`/finance/phieu-thu/${item.id}`)}
          
          // Không cho phép sửa/xóa thường trong màn hình Khôi phục
          onEdit={null}
          onDelete={null}
          
          // Render thêm nút Khôi phục và Xóa vĩnh viễn
          renderExtraActions={(item) => (
            <div style={{ display: "flex", gap: 6 }}>
              <button 
                className="action-btn restore-btn"
                title="Khôi phục phiếu thu này"
                onClick={(e) => {
                    e.stopPropagation(); // Ngăn chặn sự kiện click row
                    handleRestore(item);
                }}
              >
                <FaUndo />
              </button>
              <button 
                className="action-btn destroy-btn"
                title="Xóa vĩnh viễn"
                onClick={(e) => {
                    e.stopPropagation();
                    handleDestroy(item);
                }} 
              >
                <FaTrash />
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}