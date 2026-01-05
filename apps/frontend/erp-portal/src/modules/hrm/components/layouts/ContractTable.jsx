// apps/frontend/erp-portal/src/modules/hrm/components/layouts/ContractTable.jsx

import {
  FaCaretLeft,
  FaCaretRight,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "../styles/table.css";

/* =========================
 * Helpers
 * ========================= */

const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "";

const formatMoney = (v) =>
  typeof v === "number"
    ? v.toLocaleString("vi-VN")
    : "";

const normalizeStatus = (v) =>
  String(v || "").trim().toLowerCase();

/* =========================
 * Component
 * ========================= */

export default function ContractTable({
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

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã hợp đồng</th>
            <th>Mã NV</th>
            <th>Tên nhân viên</th>
            <th>Phòng ban</th>
            <th>Chức vụ</th>
            <th>Loại hợp đồng</th>
            <th>Ngày bắt đầu</th>
            <th>Ngày kết thúc</th>
            <th>Lương</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
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
              <td
                colSpan={hasActions ? 12 : 11}
                className="empty"
              >
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            data.map((c) => {
              const isDeleted = Boolean(c.deletedAt);

              return (
                <tr
                  key={c.contractCode}
                  className={[
                    onRowClick && "clickable",
                    isDeleted && "deleted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onRowClick?.(c)}
                >
                  <td>{c.contractCode}</td>
                  <td>{c.employeeCode}</td>
                  <td>{c.employee?.name || ""}</td>
                  <td>
                    {c.employee?.departmentName || ""}
                  </td>
                  <td>
                    {c.employee?.positionName || ""}
                  </td>
                  <td>{c.contractType}</td>
                  <td>{formatDate(c.startDate)}</td>
                  <td>{formatDate(c.endDate)}</td>
                  <td>{formatMoney(c.salary)}</td>

                  <td>
                    <span
                      className={`status ${
                        normalizeStatus(c.status) ===
                        "hiệu lực"
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>

                  <td>{formatDate(c.createdAt)}</td>

                  {hasActions && (
                    <td
                      className="actions"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >
                      {onView && (
                        <button
                          title="Xem"
                          onClick={() => onView(c)}
                        >
                          <FaEye />
                        </button>
                      )}

                      {onEdit && !isDeleted && (
                        <button
                          title="Sửa"
                          onClick={() => onEdit(c)}
                        >
                          <FaEdit />
                        </button>
                      )}

                      {onDelete && !isDeleted && (
                        <button
                          className="danger"
                          title="Xoá"
                          onClick={() =>
                            onDelete(c)
                          }
                        >
                          <FaTrash />
                        </button>
                      )}

                      {renderExtraActions &&
                        renderExtraActions(c)}
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