// apps/frontend/erp-portal/src/modules/hrm/components/layouts/OnLeaveTable.jsx

import {
  FaCaretLeft,
  FaCaretRight,
  FaEye,
  FaEdit,
} from "react-icons/fa";
import "../styles/table.css";

const normalizeCode = (v) =>
  String(v || "").trim().toUpperCase();

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

const normalizeStatus = (v) =>
  String(v || "").toLowerCase();

export default function OnLeaveTable({
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
}) {
  const hasActions = onView || onEdit;
  const colSpan = hasActions ? 10 : 9;

  const resolveDepartment = (value) => {
    const key = normalizeCode(value);
    return departmentMap[key] || value || "—";
  };

  const resolvePosition = (value) => {
    const key = normalizeCode(value);
    return positionMap[key] || value || "—";
  };

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
            data.map((e) => {
              const isDeleted = Boolean(e.deletedAt);

              return (
                <tr
                  key={e.id}
                  className={[
                    onRowClick && "clickable",
                    isDeleted && "deleted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onRowClick?.(e)}
                >
                  <td>{e.employeeCode}</td>
                  <td>{e.employeeName}</td>
                  <td>
                    {resolveDepartment(e.department)}
                  </td>
                  <td>
                    {resolvePosition(e.position)}
                  </td>
                  <td>{e.leaveType}</td>
                  <td>{formatDate(e.fromDate)}</td>
                  <td>{formatDate(e.toDate)}</td>
                  <td>{e.reason || "—"}</td>

                  <td>
                    <span
                      className={`status ${
                        normalizeStatus(e.status) ===
                        "đã duyệt"
                          ? "active"
                          : normalizeStatus(
                              e.status
                            ) === "từ chối"
                          ? "inactive"
                          : ""
                      }`}
                    >
                      {e.status}
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
                            onView(e)
                          }
                        >
                          <FaEye />
                        </button>
                      )}

                      {onEdit && !isDeleted && (
                        <button
                          title="Sửa"
                          onClick={() =>
                            onEdit(e)
                          }
                        >
                          <FaEdit />
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