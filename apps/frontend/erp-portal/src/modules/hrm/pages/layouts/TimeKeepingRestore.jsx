// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/TimeKeepingRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import TimeKeepingTable from "../../components/layouts/TimeKeepingTable";
import { timeKeepingService } from "../../services/timeKeeping.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../styles/document.css";

export default function TimeKeepingRestore() {
  const navigate = useNavigate();

  // Lưu ý: Chấm công thường định danh bằng 'id' thay vì 'code'
  const {
    data,
    loading,
    page,
    setPage,
    totalPages,
    handleRestore,
    handleDestroy,
    goBack,
  } = useRestoreResource(timeKeepingService, "id", "bảng công");

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Khôi phục chấm công</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <TimeKeepingTable
        data={data}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        // Điều hướng tới chi tiết sử dụng ID
        onView={(d) => navigate(`/hrm/cham-cong/${d.id}`)}
        // Tắt các action mặc định (edit/delete mềm)
        onEdit={null}
        onDelete={null}
        // Render action riêng cho trang Restore (Khôi phục / Xóa vĩnh viễn)
        renderExtraActions={(d) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button 
                title="Khôi phục" 
                onClick={() => handleRestore(d)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#2563eb" }}
            >
              <FaUndo />
            </button>
            <button
              title="Xoá vĩnh viễn"
              onClick={() => handleDestroy(d)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#dc2626" }}
            >
              <FaTrash />
            </button>
          </div>
        )}
      />
    </div>
  );
}