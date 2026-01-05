// apps/frontend/erp-portal/src/modules/hrm/components/layouts/EmployeeTable.jsx

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

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "";

export default function EmployeeTable({
  data = [],
  departmentMap = {},
  positionMap = {},
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
  const resolveDepartment = (value) => {
    const key = normalizeCode(value);
    return departmentMap[key] || value || "";
  };

  const resolvePosition = (value) => {
    const key = normalizeCode(value);
    return positionMap[key] || value || "";
  };

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã NV</th>
            <th>Họ tên</th>
            <th>Giới tính</th>
            <th>Ngày sinh</th>
            <th>Email</th>
            <th>SĐT</th>
            <th>Phòng ban</th>
            <th>Chức vụ</th>
            <th>Ngày vào</th>
            <th>Trạng thái</th>
            {(onView || onEdit || onDelete || renderExtraActions) && (
              <th className="action-col">Thao tác</th>
            )}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={11} className="empty">
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            data.map((e) => (
              <tr
                key={e.code}
                className={[
                  onRowClick && "clickable",
                  e.deletedAt && "deleted",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onRowClick?.(e)}
              >
                <td>{e.code}</td>
                <td>{e.name}</td>
                <td>{e.gender}</td>
                <td>{formatDate(e.dob)}</td>
                <td>{e.email}</td>
                <td>{e.phone}</td>
                <td>{resolveDepartment(e.department)}</td>
                <td>{resolvePosition(e.position)}</td>
                <td>{formatDate(e.joinDate)}</td>
                <td>{e.status}</td>

                {(onView || onEdit || onDelete) && (
                  <td
                    className="actions"
                    onClick={(ev) =>
                      ev.stopPropagation()
                    }
                  >
                    {onView && (
                      <button
                        onClick={() => onView(e)}
                        title="Xem"
                      >
                        <FaEye />
                      </button>
                    )}
                    {onEdit && !e.deletedAt && (
                      <button
                        onClick={() => onEdit(e)}
                        title="Sửa"
                      >
                        <FaEdit />
                      </button>
                    )}
                    {onDelete && !e.deletedAt && (
                      <button
                        className="danger"
                        onClick={() => onDelete(e)}
                        title="Xoá"
                      >
                        <FaTrash />
                      </button>
                    )}
                    {renderExtraActions && renderExtraActions(e)}
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