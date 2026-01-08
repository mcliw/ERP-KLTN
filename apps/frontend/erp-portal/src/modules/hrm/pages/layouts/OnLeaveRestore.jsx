import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import OnLeaveTable from "../../components/layouts/OnLeaveTable";
import { onLeaveService } from "../../services/onLeave.service";
import "../styles/document.css";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";

export default function OnLeaveRestore() {
  const navigate = useNavigate();

  const [onLeaves, setOnLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    setLoading(true);

    onLeaveService
      .getAll({ includeDeleted: true })
      .then((data) => {
        const deleted = data.filter((o) => Boolean(o.deletedAt));
        setOnLeaves(deleted);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(onLeaves.length / pageSize);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return onLeaves.slice(start, start + pageSize);
  }, [onLeaves, page]);

  const handleRestore = async (item) => {
    if (!window.confirm(`Khôi phục đơn nghỉ của ${item.employeeCode}?`)) return;

    try {
      await onLeaveService.restore(item.id);
      setOnLeaves((prev) => prev.filter((x) => x.id !== item.id));
    } catch {
      alert("Không thể khôi phục đơn nghỉ");
    }
  };

  const handleDestroy = async (item) => {
    if (
      !window.confirm(
        `Xoá VĨNH VIỄN đơn nghỉ của ${item.employeeCode}? Hành động này không thể hoàn tác!`
      )
    )
      return;

    try {
      await onLeaveService.destroy(item.id);
      setOnLeaves((prev) => prev.filter((x) => x.id !== item.id));
    } catch {
      alert("Không thể xoá vĩnh viễn đơn nghỉ");
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      {/* HEADER */}
      <div className="page-header">
        <h2>Đơn nghỉ đã xoá</h2>

        <button className="btn-secondary" onClick={() => navigate(-1)}>
          <FaArrowLeft style={{ marginRight: 5 }} />
          <span>Quay lại</span>
        </button>
      </div>

      {/* TABLE */}
      <OnLeaveTable
        data={paginated}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        onView={(o) => navigate(`/hrm/nghi-phep/${o.id}`)}
        onEdit={null}
        onDelete={null}
        onRowClick={null}
        renderExtraActions={(o) => (
          <div style={{ display: "flex", gap: 6 }}>
            {/* ♻️ Khôi phục */}
            <button title="Khôi phục" onClick={() => handleRestore(o)}>
              <FaUndo />
            </button>

            {/* 🗑️ Xoá vĩnh viễn */}
            <button
              title="Xoá vĩnh viễn"
              onClick={() => handleDestroy(o)}
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
