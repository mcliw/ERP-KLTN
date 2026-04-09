// apps/frontend/erp-portal/src/modules/crm/pages/CustomerRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import CustomerTable from "../../components/layouts/CustomerTable";
import { customerService } from "../../services/customer.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";
import { useMemo } from "react"; // Thêm useMemo

export default function CustomerRestore() {
  const navigate = useNavigate();
  
  // 1. Dùng useMemo để hàm filter không bị khởi tạo lại gây re-render
  const customerDeletedFilter = useMemo(() => (item) => isSoftDeleted(item.deleted_at), []);

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
    customerService, 
    "id", 
    "khách hàng",
    customerDeletedFilter
  );

  // 2. Thay thế việc dùng "if (loading) return..." bằng cách render ổn định
  // Điều này giúp khung màn hình không bị giật/nhảy khi loading
  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Khách hàng đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <div className={`table-wrapper ${loading ? "loading-fade" : ""}`}>
        {/* Chỉ hiển thị overlay thay vì xóa bỏ Table */}
        {loading && <div className="table-overlay">Đang tải...</div>}
        
        <CustomerTable
          data={data}
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(p - 1, 1))}
          onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
          onView={(item) => navigate(`/crm/khach-hang/${item.id}`)}
          onEdit={null}
          onDelete={null}
          renderExtraActions={(item) => (
            <div style={{ display: "flex", gap: 6 }}>
              <button 
                className="action-btn restore-btn"
                onClick={() => handleRestore(item)}
              >
                <FaUndo />
              </button>
              <button 
                className="action-btn destroy-btn"
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