// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/OnLeaveRestore.jsx
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import OnLeaveTable from "../../components/layouts/OnLeaveTable";
import { onLeaveService } from "../../services/onLeave.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../styles/document.css";

export default function OnLeaveRestore() {
  const navigate = useNavigate();

  const {
    data,
    loading,
    page,
    setPage,
    totalPages,
    handleRestore,
    handleDestroy,
    goBack,
  } = useRestoreResource(onLeaveService, "id", "đơn nghỉ");

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Đơn nghỉ đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <OnLeaveTable
        data={data}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        onView={(o) => navigate(`/hrm/nghi-phep/${o.id}`)}
        onEdit={null}
        onDelete={null}
        renderExtraActions={(o) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              title="Khôi phục"
              onClick={(e) => {
                e.stopPropagation();
                handleRestore(o);
              }}
            >
              <FaUndo />
            </button>

            <button
              type="button"
              title="Xoá vĩnh viễn"
              onClick={(e) => {
                e.stopPropagation();
                handleDestroy(o);
              }}
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
