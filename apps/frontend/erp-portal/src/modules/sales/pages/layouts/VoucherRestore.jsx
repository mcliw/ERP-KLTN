// apps/frontend/erp-portal/src/modules/sales/pages/VoucherRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import VoucherTable from "../../components/layouts/VoucherTable";
import { voucherService } from "../../services/voucher.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";
import { useMemo } from "react";

export default function VoucherRestore() {
  const navigate = useNavigate();
  
  // 1. Dùng useMemo để hàm filter không bị khởi tạo lại gây re-render
  // Filter các item có trường deleted_at không null/rỗng
  const voucherDeletedFilter = useMemo(() => (item) => isSoftDeleted(item.deleted_at), []);

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
    voucherService, 
    "id", 
    "mã giảm giá",
    voucherDeletedFilter
  );

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Mã giảm giá đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <div className={`table-wrapper ${loading ? "loading-fade" : ""}`}>
        {/* Chỉ hiển thị overlay thay vì xóa bỏ Table để tránh giật layout */}
        {loading && <div className="table-overlay">Đang tải...</div>}
        
        <VoucherTable
          data={data}
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(p - 1, 1))}
          onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
          // Điều hướng khi click xem chi tiết (kể cả item đã xóa)
          onView={(item) => navigate(`/sales/ma-giam-gia/${item.id}`)}
          // Disable các action sửa/xóa thường trong màn hình thùng rác
          onEdit={null}
          onDelete={null}
          
          // Render action Khôi phục & Xóa vĩnh viễn
          renderExtraActions={(item) => (
            <div style={{ display: "flex", gap: 6 }}>
              <button 
                className="action-btn restore-btn"
                title="Khôi phục"
                onClick={() => handleRestore(item)}
              >
                <FaUndo />
              </button>
              <button 
                className="action-btn destroy-btn"
                title="Xóa vĩnh viễn"
                onClick={() => handleDestroy(item)} 
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