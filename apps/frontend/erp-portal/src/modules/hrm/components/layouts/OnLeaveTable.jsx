// apps/frontend/erp-portal/src/modules/hrm/components/layouts/OnLeaveTable.jsx

import {
  FaCaretLeft,
  FaCaretRight,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "../styles/table.css";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";

/* ================= HELPERS ================= */
const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

const normalizeStatus = (v) =>
  String(v || "").toLowerCase();

export default function OnLeaveTable({
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
  const { user } = useAuthStore();

  const hasActions =
    onView || onEdit || onDelete || renderExtraActions;

  const colSpan = hasActions ? 10 : 9;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã NV</th>
            <th>Họ tên</th>
            <th>Phòng ban</th>
            <th>Chức vụ</th>
            <th>Loại nghỉ</th>
            <th>Từ ngày</th>
            <th>Đến ngày</th>
            <th>Lý do</th>
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
            data.map((o) => {
              const isPending = normalizeStatus(o.status) === "chờ duyệt";
              const isManager = HRM_PERMISSIONS.LEAVE_EDIT.includes(user?.role);
              const canEditOrDelete = isManager || isPending;

              const isDeleted = Boolean(o.deletedAt);

              return (
                <tr
                  key={o.id}
                  className={[
                    onRowClick && "clickable",
                    isDeleted && "deleted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onRowClick?.(o)}
                >
                  <td>{o.employeeCode || "-"}</td>
                  <td>{o.employeeName || "-"}</td>
                  <td>{o.departmentName || "-"}</td>
                  <td>{o.positionName || "-"}</td>
                  <td>{o.leaveType || "-"}</td>
                  <td>{formatDate(o.fromDate)}</td>
                  <td>{formatDate(o.toDate)}</td>
                  <td>{o.reason || "—"}</td>

                  <td>
                    <span
                      className={`status ${
                        isDeleted
                          ? "deleted"
                          : normalizeStatus(o.status) === "đã duyệt"
                          ? "active"
                          : normalizeStatus(o.status) === "từ chối"
                          ? "inactive"
                          : ""
                      }`}
                    >
                      {isDeleted
                        ? "Đã xoá"
                        : o.status || "Không rõ"}
                    </span>
                  </td>

                  {hasActions && (
                    <td
                      className="actions"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      {onView && (
                        <button title="Xem" onClick={() => onView(o)}>
                          <FaEye />
                        </button>
                      )}

                      {onEdit && !isDeleted && canEditOrDelete && (
                        <button title="Sửa" onClick={() => onEdit(o)}>
                          <FaEdit />
                        </button>
                      )}

                      {onDelete && !isDeleted && canEditOrDelete && (
                        <button className="danger" title="Xóa" onClick={() => onDelete(o)}>
                          <FaTrash />
                        </button>
                      )}

                      {renderExtraActions?.(o)}
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