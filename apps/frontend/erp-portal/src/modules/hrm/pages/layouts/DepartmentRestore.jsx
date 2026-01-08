// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/DepartmentRestore.jsx

import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
import DepartmentTable from "../../components/layouts/DepartmentTable";
import { departmentService } from "../../services/department.service";
import "../styles/document.css";
import "../../../../shared/styles/button.css";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";

/* =========================
 * Component
 * ========================= */

export default function DepartmentRestore() {
  const navigate = useNavigate();

  /* =========================
   * State
   * ========================= */

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const pageSize = 7;

  /* =========================
   * Load deleted departments
   * ========================= */

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const all = await departmentService.getAll({
        includeDeleted: true,
      });

      const deleted = all.filter((d) => d.deletedAt);
      setDepartments(deleted);
      setPage(1); // reset page khi reload
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  /* =========================
   * Pagination
   * ========================= */

  const totalPages = Math.max(
    1,
    Math.ceil(departments.length / pageSize)
  );

  const paginatedDepartments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return departments.slice(start, start + pageSize);
  }, [departments, page]);

  /* =========================
   * Handlers
   * ========================= */

  const handleRestore = async (dept) => {
    const ok = window.confirm(
      `Khôi phục phòng ban ${dept.name}?`
    );
    if (!ok) return;

    try {
      await departmentService.restore(dept.code);
      await loadDepartments();
    } catch {
      alert("Không thể khôi phục phòng ban");
    }
  };

  const handleDestroy = async (dept) => {
    const ok = window.confirm(
      `XOÁ VĨNH VIỄN phòng ban ${dept.name}?\nHành động này KHÔNG THỂ hoàn tác!`
    );
    if (!ok) return;

    try {
      await departmentService.destroy(dept.code);
      await loadDepartments();
    } catch {
      alert("Không thể xoá vĩnh viễn phòng ban");
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
        <h2>Phòng ban đã xoá</h2>

        <button
          className="btn-secondary"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft style={{ marginRight: 5 }} />
          <span>Quay lại</span>
        </button>
      </div>

      {/* TABLE */}
      <DepartmentTable
        data={paginatedDepartments}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() =>
          setPage((p) => Math.min(p + 1, totalPages))
        }
        onRowClick={null}
        onView={(d) =>
          navigate(`/hrm/phong-ban/${d.code}`)
        }
        onEdit={null}
        onDelete={null}
        renderExtraActions={(d) => (
          <div style={{ display: "flex", gap: 6 }}>
            {/* ♻️ Khôi phục */}
            <button
              title="Khôi phục"
              onClick={() => handleRestore(d)}
            >
              <FaUndo />
            </button>

            {/* 🗑️ Xoá vĩnh viễn */}
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