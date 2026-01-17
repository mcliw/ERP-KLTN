// apps/frontend/erp-portal/src/modules/asset/components/layouts/AssetTable.jsx

import {
  FaCaretLeft,
  FaCaretRight,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "../styles/table.css";

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

const formatDate = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "");

const formatMoney = (v) => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("vi-VN");
};

const formatWarranty = (a) => {
  if (a.warrantyEndDate) return `Đến ${formatDate(a.warrantyEndDate)}`;
  if (a.warrantyMonths) return `${a.warrantyMonths} tháng`;
  return "";
};

export default function AssetTable({
  data = [],

  // Map mã -> tên hiển thị
  categoryMap = {}, // VD: { IT:"Tài sản CNTT", OFFICE:"Văn phòng", VEHICLE:"Phương tiện" }
  typeMap = {}, // VD: { LAPTOP:"Laptop", PC:"PC", PRINTER:"Máy in" }
  statusMap = {}, // VD: { IN_USE:"Đang dùng", IN_STOCK:"Trong kho", REPAIR:"Đang sửa", DISPOSED:"Thanh lý" }
  departmentMap = {}, // VD: { HR:"Nhân sự", IT:"CNTT" }
  locationMap = {}, // VD: { HCM:"Hồ Chí Minh", HN:"Hà Nội" }
  conditionMap = {}, // VD: { NEW:"Mới", GOOD:"Tốt", FAIR:"Khá", POOR:"Kém" }

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
            <th>Mã TS</th>
            <th>Tên tài sản</th>
            <th>Nhóm</th>
            <th>Loại</th>
            <th>Serial/Tag</th>
            <th>Phòng ban</th>
            <th>Người sử dụng</th>
            <th>Vị trí</th>
            <th>Tình trạng</th>
            <th>Trạng thái</th>
            <th>Ngày mua</th>
            <th>Giá mua</th>
            <th>Bảo hành</th>

            {(onView || onEdit || onDelete || renderExtraActions) && (
              <th className="action-col">Thao tác</th>
            )}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={14} className="empty">
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            data.map((a) => (
              <tr
                key={a.code || a.id}
                className={[
                  onRowClick && "clickable",
                  a.deletedAt && "deleted",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onRowClick?.(a)}
              >
                <td>{a.code}</td>
                <td>{a.name}</td>
                <td>{resolveMap(categoryMap, a.category)}</td>
                <td>{resolveMap(typeMap, a.type)}</td>
                <td>{a.serial || a.assetTag}</td>
                <td>{resolveMap(departmentMap, a.department)}</td>
                <td>{a.assignedToName || a.assignedTo || ""}</td>
                <td>{resolveMap(locationMap, a.location)}</td>
                <td>{resolveMap(conditionMap, a.condition)}</td>
                <td>{resolveMap(statusMap, a.status)}</td>
                <td>{formatDate(a.purchaseDate)}</td>
                <td>{formatMoney(a.purchasePrice)}</td>
                <td>{formatWarranty(a)}</td>

                {(onView || onEdit || onDelete || renderExtraActions) && (
                  <td className="actions" onClick={(ev) => ev.stopPropagation()}>
                    {onView && (
                      <button onClick={() => onView(a)} title="Xem">
                        <FaEye />
                      </button>
                    )}

                    {onEdit && !a.deletedAt && (
                      <button onClick={() => onEdit(a)} title="Sửa">
                        <FaEdit />
                      </button>
                    )}

                    {onDelete && !a.deletedAt && (
                      <button
                        className="danger"
                        onClick={() => onDelete(a)}
                        title="Xoá"
                      >
                        <FaTrash />
                      </button>
                    )}

                    {renderExtraActions && renderExtraActions(a)}
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
