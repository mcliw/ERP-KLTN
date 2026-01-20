// apps/frontend/erp-portal/src/modules/finance/pages/PaymentSlipRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import PaymentSlipTable from "../../components/layouts/PaymentSlipTable";
import { paymentSlipService } from "../../services/paymentSlip.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";
import { useMemo } from "react"; 

export default function PaymentSlipRestore() {
  const navigate = useNavigate();
  
  // 1. Dùng useMemo để hàm filter không bị khởi tạo lại gây re-render
  // Lọc ra các phiếu chi đã bị xóa mềm (có deleted_at)
  const paymentDeletedFilter = useMemo(() => (item) => isSoftDeleted(item.deleted_at), []);

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
    paymentSlipService, 
    "id",            // Tên trường ID của phiếu chi
    "phiếu chi",     // Tên tài nguyên hiển thị trong thông báo
    paymentDeletedFilter
  );

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Phiếu chi đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <div className={`table-wrapper ${loading ? "loading-fade" : ""}`}>
        {/* Chỉ hiển thị overlay thay vì xóa bỏ Table */}
        {loading && <div className="table-overlay">Đang tải...</div>}
        
        <PaymentSlipTable
          data={data}
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(p - 1, 1))}
          onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
          
          // Điều hướng khi click xem chi tiết (vẫn xem được dù đã xóa)
          onView={(item) => navigate(`/finance/phieu-chi/${item.id}`)}
          
          // Không cho phép sửa/xóa thường trong màn hình Khôi phục
          onEdit={null}
          onDelete={null}
          
          // Render thêm nút Khôi phục và Xóa vĩnh viễn
          renderExtraActions={(item) => (
            <div style={{ display: "flex", gap: 6 }}>
              <button 
                className="action-btn restore-btn"
                title="Khôi phục phiếu chi này"
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