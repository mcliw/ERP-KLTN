// apps/frontend/erp-portal/src/modules/hrm/components/common/TableComponents.jsx

import {
  FaCaretLeft,
  FaCaretRight,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "../styles/table.css";

export const StatusBadge = ({ status, isDeleted, label }) => {
  let className = "status";
  const normalizedStatus = String(status || "").toLowerCase();

  if (isDeleted) {
    className += " deleted";
  } else if (["hoạt động", "đã duyệt"].includes(normalizedStatus)) {
    className += " active";
  } else if (["ngưng hoạt động", "từ chối", "inactive"].includes(normalizedStatus)) {
    className += " inactive";
  }

  return (
    <span className={className}>
      {isDeleted ? "Đã xoá" : label || status || "—"}
    </span>
  );
};

export const TableActions = ({
  data,
  onView,
  onEdit,
  onDelete,
  renderExtra,
  canEdit = true,
  canDelete = true,
  isDeleted = false,
  deleteTitle = "Xoá",
}) => {
  return (
    <td className="actions" onClick={(e) => e.stopPropagation()}>
      {onView && (
        <button onClick={() => onView(data)} title="Xem">
          <FaEye />
        </button>
      )}

      {onEdit && !isDeleted && canEdit && (
        <button onClick={() => onEdit(data)} title="Sửa">
          <FaEdit />
        </button>
      )}

      {onDelete && !isDeleted && canDelete && (
        <button className="danger" onClick={() => onDelete(data)} title={deleteTitle}>
          <FaTrash />
        </button>
      )}

      {renderExtra && renderExtra(data)}
    </td>
  );
};

export const EmptyRow = ({ colSpan, message = "Không có dữ liệu" }) => (
  <tr>
    <td colSpan={colSpan} className="empty">
      {message}
    </td>
  </tr>
);

export const TablePagination = ({ page, totalPages, onPrev, onNext }) => (
  <div className="pagination">
    <button disabled={page === 1} onClick={onPrev}>
      <FaCaretLeft /> Trước
    </button>
    <span>
      Trang {page} / {totalPages}
    </span>
    <button disabled={page === totalPages} onClick={onNext}>
      Sau <FaCaretRight />
    </button>
  </div>
);

export const formatDate = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");