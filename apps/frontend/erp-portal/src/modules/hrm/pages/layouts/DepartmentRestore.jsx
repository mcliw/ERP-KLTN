// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/DepartmentRestore.jsx
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import DepartmentTable from "../../components/layouts/DepartmentTable";
import { departmentService } from "../../services/department.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../../../../shared/styles/document.css";

export default function DepartmentRestore() {
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
  } = useRestoreResource(departmentService, "code", "phòng ban");

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Phòng ban đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <DepartmentTable
        data={data}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        onView={(d) => navigate(`/hrm/phong-ban/${d.code}`)}
        onEdit={null}
        onDelete={null}
        renderExtraActions={(d) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button title="Khôi phục" onClick={() => handleRestore(d)}>
              <FaUndo />
            </button>
            <button
              title="Xoá vĩnh viễn"
              onClick={() => handleDestroy(d)}
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
