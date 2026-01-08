// apps/frontend/erp-portal/src/modules/hrm/components/layouts/AccountTable.jsx

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

export default function AccountTable({
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

  const colSpan = hasActions ? 9 : 8;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Tên đăng nhập</th>
            <th>Tên nhân viên</th>
            <th>Email</th>
            <th>Phòng ban</th>
            <th>Chức vụ</th>
            <th>Phân quyền</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
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
            data.map((a) => {
              const emp = a.employee || {};
              const isDeleted = Boolean(a.deletedAt);

              return (
                <tr
                  key={a.username}
                  className={[
                    onRowClick && "clickable",
                    isDeleted && "deleted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onRowClick?.(a)}
                >
                  <td>{a.username}</td>
                  <td>{emp.name || "-"}</td>
                  <td>{emp.email || "-"}</td>
                  <td>{emp.departmentName || "-"}</td>
                  <td>{emp.positionName || "-"}</td>
                  <td>{a.role || "-"}</td>

                  <td>
                    <span
                      className={`status ${
                        a.deletedAt
                          ? "deleted"
                          : normalizeStatus(a.status) === "hoạt động"
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {a.deletedAt ? "Đã xoá" : a.status || "Không rõ"}
                    </span>
                  </td>

                  <td>{formatDate(a.createdAt)}</td>

                  {hasActions && (
                    <td
                      className="actions"
                      onClick={(ev) =>
                        ev.stopPropagation()
                      }
                    >
                      {onView && (
                        <button
                          onClick={() => onView(a)}
                          title="Xem"
                        >
                          <FaEye />
                        </button>
                      )}

                      {onEdit && !isDeleted && (
                        <button
                          onClick={() => onEdit(a)}
                          title="Sửa"
                        >
                          <FaEdit />
                        </button>
                      )}

                      {onDelete && !isDeleted && (
                        <button
                          className="danger"
                          onClick={() => onDelete(a)}
                          title="Xoá"
                        >
                          <FaTrash />
                        </button>
                      )}

                      {/* EXTRA ACTIONS (restore, reset pw, ...) */}
                      {renderExtraActions?.(a)}
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