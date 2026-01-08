// apps/frontend/erp-portal/src/modules/hrm/components/layouts/DepartmentTable.jsx

import {
  FaCaretLeft,
  FaCaretRight,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "../styles/table.css";

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
  renderExtraActions,
}) {
  const hasActions =
    onView || onEdit || onDelete || renderExtraActions;

  const colSpan = hasActions ? 7 : 6;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã phòng ban</th>
            <th>Tên phòng ban</th>
            <th>Trưởng phòng</th>
            <th>Mô tả</th>
            <th>Số NV</th>
            <th>Trạng thái</th>
            {hasActions && (
              <th className="action-col">Thao tác</th>
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
            data.map((d) => (
              <tr
                key={d.code}
                className={[
                  onRowClick && "clickable",
                  d.deletedAt && "deleted",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onRowClick?.(d)}
              >
                <td>{d.code}</td>
                <td>{d.name}</td>
                <td>{d.managerName || "—"}</td>
                <td>{d.description || "—"}</td>
                <td>{d.employeeCount ?? 0}</td>
                <td>
                  {d.deletedAt
                    ? "Đã xoá"
                    : d.status === "Ngưng hoạt động"
                    ? "Ngưng hoạt động"
                    : "Hoạt động"}
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
                        onClick={() => onView(d)}
                      >
                        <FaEye />
                      </button>
                    )}

                    {onEdit && !d.deletedAt && (
                      <button
                        title="Sửa"
                        onClick={() => onEdit(d)}
                      >
                        <FaEdit />
                      </button>
                    )}

                    {onDelete && !d.deletedAt && (
                      <button
                        className="danger"
                        title={
                          d.employeeCount > 0
                            ? "Không thể xoá vì vẫn còn nhân viên"
                            : "Xoá"
                        }
                        onClick={() => onDelete(d)}
                      >
                        <FaTrash />
                      </button>
                    )}

                    {renderExtraActions &&
                      renderExtraActions(d)}
                  </td>
                )}
              </tr>
            ))
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