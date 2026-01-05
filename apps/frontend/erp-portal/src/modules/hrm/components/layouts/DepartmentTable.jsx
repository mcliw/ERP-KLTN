// apps/frontend/erp-portal/src/modules/hrm/components/layouts/DepartmentTable.jsx

import {
  FaCaretLeft,
  FaCaretRight,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "../styles/table.css";

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

const normalizeStatus = (v) =>
  String(v || "").toLowerCase();

export default function DepartmentTable({
  data = [],
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
  const colSpan = hasActions ? 7 : 6;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã phòng ban</th>
            <th>Tên phòng ban</th>
            <th>Trưởng phòng</th>
            <th>Số lượng nhân viên</th>
            <th>Ngày tạo</th>
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
            data.map((d) => {
              const isDeleted = Boolean(d.deletedAt);

              return (
                <tr
                  key={d.code}
                  className={[
                    onRowClick && "clickable",
                    isDeleted && "deleted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onRowClick?.(d)}
                >
                  <td>{d.code}</td>
                  <td>{d.name}</td>
                  <td>{d.manager || "—"}</td>
                  <td>{d.employeeCount ?? 0}</td>
                  <td>{formatDate(d.createdAt)}</td>

                  <td>
                    <span
                      className={`status ${
                        normalizeStatus(d.status) ===
                        "hoạt động"
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {d.status}
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
                            onView(d)
                          }
                        >
                          <FaEye />
                        </button>
                      )}

                      {onEdit && !isDeleted && (
                        <button
                          title="Sửa"
                          onClick={() =>
                            onEdit(d)
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
                            onDelete(d)
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