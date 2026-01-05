// apps/frontend/erp-portal/src/modules/hrm/components/layouts/PositionTable.jsx

import {
  FaCaretLeft,
  FaCaretRight,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "../styles/table.css";

const normalizeCode = (v) =>
  String(v || "").trim().toUpperCase();

const normalizeStatus = (v) =>
  String(v || "").toLowerCase();

export default function PositionTable({
  data = [],
  departmentMap = {},
  page = 1,
  totalPages = 1,
  onPrev,
  onNext,
  onRowClick,
  onView,
  onEdit,
  onDelete,
}) {
  const hasActions = onView || onEdit || onDelete;
  const colSpan = hasActions ? 8 : 7;

  const resolveDepartment = (value) => {
    const key = normalizeCode(value);
    return departmentMap[key] || value || "—";
  };

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã chức vụ</th>
            <th>Tên chức vụ</th>
            <th>Người đảm nhận</th>
            <th>Số người đảm nhận</th>
            <th>Phòng ban</th>
            <th>Cấp bậc</th>
            <th>Trạng thái</th>
            {hasActions && (
              <th className="action-col">
                Thao tác
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="empty">
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            data.map((p) => {
              const isDeleted = Boolean(p.deletedAt);

              const assigned =
                typeof p.assigneeCount === "number"
                  ? p.assigneeCount
                  : p.assignees?.length ?? 0;

              const capacity = p.capacity ?? 1;

              return (
                <tr
                  key={p.code}
                  className={[
                    onRowClick && "clickable",
                    isDeleted && "deleted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onRowClick?.(p)}
                >
                  <td>{p.code}</td>
                  <td>{p.name}</td>

                  <td>
                    {p.assignees?.length
                      ? p.assignees
                          .map((e) => e.name)
                          .join(", ")
                      : "—"}
                  </td>

                  <td>
                    {assigned} / {capacity}
                  </td>

                  <td>
                    {resolveDepartment(p.department)}
                  </td>

                  <td>{p.level || "—"}</td>

                  <td>
                    <span
                      className={`status ${
                        normalizeStatus(p.status) ===
                        "hoạt động"
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  {hasActions && (
                    <td
                      className="actions"
                      onClick={(ev) =>
                        ev.stopPropagation()
                      }
                    >
                      {onView && (
                        <button
                          title="Xem"
                          onClick={() =>
                            onView(p)
                          }
                        >
                          <FaEye />
                        </button>
                      )}

                      {onEdit && !isDeleted && (
                        <button
                          title="Sửa"
                          onClick={() =>
                            onEdit(p)
                          }
                        >
                          <FaEdit />
                        </button>
                      )}

                      {onDelete && !isDeleted && (
                        <button
                          className="danger"
                          title="Xoá"
                          onClick={() =>
                            onDelete(p)
                          }
                        >
                          <FaTrash />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* PAGINATION */}
      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={onPrev}
        >
          <FaCaretLeft /> Trước
        </button>

        <span>
          Trang {page} / {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={onNext}
        >
          Sau <FaCaretRight />
        </button>
      </div>
    </>
  );
}