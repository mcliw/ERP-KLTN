// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/PositionRestore.jsx

import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
import PositionTable from "../../components/layouts/PositionTable";
import { positionService } from "../../services/position.service";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import "../styles/document.css";
import "../../../../shared/styles/button.css";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";

/* =========================
 * Component
 * ========================= */

export default function PositionRestore() {
  const navigate = useNavigate();
  const { departmentMap } = useLookupMaps();

  /* =========================
   * State
   * ========================= */

  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const pageSize = 7;

  /* =========================
   * Load deleted positions
   * ========================= */

  const loadPositions = useCallback(async () => {
    setLoading(true);
    try {
      const all = await positionService.getAll({
        includeDeleted: true,
      });

      const deleted = all.filter((p) => p.deletedAt);
      setPositions(deleted);
      setPage(1); // reset page khi reload
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  /* =========================
   * Pagination
   * ========================= */

  const totalPages = Math.max(
    1,
    Math.ceil(positions.length / pageSize)
  );

  const paginatedPositions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return positions.slice(start, start + pageSize);
  }, [positions, page]);

  /* =========================
   * Handlers
   * ========================= */

  const handleRestore = async (pos) => {
    const ok = window.confirm(
      `Khôi phục chức vụ ${pos.name}?`
    );
    if (!ok) return;

    try {
      await positionService.restore(pos.code);
      await loadPositions();
    } catch {
      alert("Không thể khôi phục chức vụ");
    }
  };

  const handleDestroy = async (pos) => {
    const ok = window.confirm(
      `XOÁ VĨNH VIỄN chức vụ ${pos.name}?\nHành động này KHÔNG THỂ hoàn tác!`
    );
    if (!ok) return;

    try {
      await positionService.destroy(pos.code);
      await loadPositions();
    } catch {
      alert("Không thể xoá vĩnh viễn chức vụ");
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
        <h2>Chức vụ đã xoá</h2>

        <button
          className="btn-secondary"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft style={{ marginRight: 5 }} />
          <span>Quay lại</span>
        </button>
      </div>

      {/* TABLE */}
      <PositionTable
        data={paginatedPositions}
        departmentMap={departmentMap}
        page={page}
        totalPages={totalPages}
        onPrev={() =>
          setPage((p) => Math.max(p - 1, 1))
        }
        onNext={() =>
          setPage((p) =>
            Math.min(p + 1, totalPages)
          )
        }
        onRowClick={null}
        onView={(p) =>
          navigate(`/hrm/chuc-vu/${p.code}`)
        }
        onEdit={null}
        onDelete={null}
        renderExtraActions={(p) => (
          <div style={{ display: "flex", gap: 6 }}>
            {/* ♻️ Khôi phục */}
            <button
              title="Khôi phục"
              onClick={() => handleRestore(p)}
            >
              <FaUndo />
            </button>

            {/* 🗑️ Xoá vĩnh viễn */}
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
