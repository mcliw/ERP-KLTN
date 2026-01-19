// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/EmployeeDocumentRestore.jsx
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import EmployeeTable from "../../components/layouts/EmployeeTable";
import { employeeService } from "../../services/employee.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import "../../../../shared/styles/document.css";

export default function EmployeeDocumentRestore() {
  const navigate = useNavigate();
  const { departmentMap, positionMap } = useLookupMaps();

  const { 
    data, loading, page, setPage, totalPages, handleRestore, handleDestroy, goBack 
  } = useRestoreResource(employeeService, "code", "hồ sơ nhân viên");

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Hồ sơ nhân viên đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <EmployeeTable
        data={data}
        departmentMap={departmentMap}
        positionMap={positionMap}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        onView={(e) => navigate(`/hrm/ho-so-nhan-vien/${e.code}`)}
        onEdit={null}
        onDelete={null}
        renderExtraActions={(e) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button title="Khôi phục" onClick={() => handleRestore(e)}>
              <FaUndo />
            </button>
            <button title="Xoá vĩnh viễn" onClick={() => handleDestroy(e)} style={{ color: "#dc2626" }}>
              <FaTrash />
            </button>
          </div>
        )}
      />
    </div>
  );
}