// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/PositionRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import PositionTable from "../../components/layouts/PositionTable";
import { positionService } from "../../services/position.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import "../../../../shared/styles/document.css";

export default function PositionRestore() {
  const navigate = useNavigate();
  const { departmentMap } = useLookupMaps();

  const {
    data,
    loading,
    page,
    setPage,
    totalPages,
    handleRestore,
    handleDestroy,
    goBack,
  } = useRestoreResource(positionService, "code", "chức vụ");

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Chức vụ đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <PositionTable
        data={data}
        departmentMap={departmentMap}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        onView={(p) => navigate(`/hrm/chuc-vu/${p.code}`)}
        onEdit={null}
        onDelete={null}
        renderExtraActions={(p) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button title="Khôi phục" onClick={() => handleRestore(p)}>
              <FaUndo />
            </button>
            <button
              title="Xoá vĩnh viễn"
              onClick={() => handleDestroy(p)}
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
