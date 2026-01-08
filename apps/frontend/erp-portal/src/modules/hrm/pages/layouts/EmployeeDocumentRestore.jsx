import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
import EmployeeTable from "../../components/layouts/EmployeeTable";
import { employeeService } from "../../services/employee.service";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import "../styles/document.css";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";

/* =========================
 * Component
 * ========================= */

export default function EmployeeDocumentRestore() {
  const navigate = useNavigate();
  const { departmentMap, positionMap } = useLookupMaps();

  /* =========================
   * State
   * ========================= */

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const pageSize = 7;

  /* =========================
   * Load deleted employees
   * ========================= */

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const all = await employeeService.getAll({
        includeDeleted: true,
      });

      const deleted = all.filter((e) => e.deletedAt);
      setEmployees(deleted);
      setPage(1); // reset page khi reload
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  /* =========================
   * Pagination
   * ========================= */

  const totalPages = Math.max(
    1,
    Math.ceil(employees.length / pageSize)
  );

  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return employees.slice(start, start + pageSize);
  }, [employees, page]);

  /* =========================
   * Handlers
   * ========================= */

  const handleRestore = async (emp) => {
    const ok = window.confirm(
      `Khôi phục hồ sơ nhân viên ${emp.name}?`
    );
    if (!ok) return;

    try {
      await employeeService.restore(emp.code);
      await loadEmployees();
    } catch {
      alert("Không thể khôi phục hồ sơ nhân viên");
    }
  };

  const handleDestroy = async (emp) => {
    const ok = window.confirm(
        `XOÁ VĨNH VIỄN hồ sơ ${emp.name}?\nHành động này KHÔNG THỂ hoàn tác!`
    );
    if (!ok) return;

    try {
        await employeeService.destroy(emp.code);
        await loadEmployees();
    } catch {
        alert("Không thể xoá vĩnh viễn hồ sơ nhân viên");
    }
    };

  /* =========================
   * Render
   * ========================= */

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  return (
    <div className="main-document">
      {/* HEADER */}
      <div className="page-header">
        <h2>Hồ sơ nhân viên đã xoá</h2>

        <button
          className="btn-secondary"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft style={{ marginRight: 5 }} />
          <span>Quay lại</span>
        </button>
      </div>

      {/* TABLE */}
      <EmployeeTable
        data={paginatedEmployees}
        departmentMap={departmentMap}
        positionMap={positionMap}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() =>
            setPage((p) => Math.min(p + 1, totalPages))
        }
        onView={(e) =>
            navigate(`/hrm/ho-so-nhan-vien/${e.code}`)
        }
        onEdit={null}
        onDelete={null}
        onRowClick={null}
        renderExtraActions={(e) => (
            <div style={{ display: "flex", gap: 6 }}>
            {/* ♻️ Khôi phục */}
            <button
                title="Khôi phục"
                onClick={() => handleRestore(e)}
            >
                <FaUndo />
            </button>

            {/* 🗑️ Xoá vĩnh viễn */}
            <button
                title="Xoá vĩnh viễn"
                onClick={() => handleDestroy(e)}
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