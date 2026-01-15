// apps/frontend/erp-portal/src/modules/inventory/components/layouts/WarehouseTable.jsx

import {
  FaCaretLeft,
  FaCaretRight,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "../styles/table.css";

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export default function WarehouseTable({
  data = [],

  // Map mã -> tên hiển thị (tuỳ hệ thống lưu mã hay text)
  typeMap = {}, // VD: { MAIN:"Kho tổng", BRANCH:"Kho chi nhánh", TEMP:"Kho tạm" }
  locationMap = {}, // VD: { HCM:"Hồ Chí Minh", HN:"Hà Nội" }
  statusMap = {}, // VD: { ACTIVE:"Đang hoạt động", INACTIVE:"Ngừng hoạt động" }

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
  const resolveMap = (map, value) => {
    const key = normalizeCode(value);
    return map[key] || value || "";
  };

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã kho</th>
            <th>Tên kho</th>
            <th>Loại kho</th>
            <th>Địa điểm</th>
            <th>Người phụ trách</th>
            <th>Trạng thái</th>

            {(onView || onEdit || onDelete || renderExtraActions) && (
              <th className="action-col">Thao tác</th>
            )}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="empty">
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            data.map((w) => (
              <tr
                key={w.code || w.id}
                className={[
                  onRowClick && "clickable",
                  w.deletedAt && "deleted",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onRowClick?.(w)}
              >
                <td>{w.code}</td>
                <td>{w.name}</td>
                <td>{resolveMap(typeMap, w.type)}</td>
                <td>{resolveMap(locationMap, w.location)}</td>
                <td>{w.managerName || w.manager || ""}</td>
                <td>{resolveMap(statusMap, w.status)}</td>

                {(onView || onEdit || onDelete || renderExtraActions) && (
                  <td className="actions" onClick={(ev) => ev.stopPropagation()}>
                    {onView && (
                      <button onClick={() => onView(w)} title="Xem">
                        <FaEye />
                      </button>
                    )}

                    {onEdit && !w.deletedAt && (
                      <button onClick={() => onEdit(w)} title="Sửa">
                        <FaEdit />
                      </button>
                    )}

                    {onDelete && !w.deletedAt && (
                      <button
                        className="danger"
                        onClick={() => onDelete(w)}
                        title="Xoá"
                      >
                        <FaTrash />
                      </button>
                    )}

                    {renderExtraActions && renderExtraActions(w)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINATION */}
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
    </>
  );
}
