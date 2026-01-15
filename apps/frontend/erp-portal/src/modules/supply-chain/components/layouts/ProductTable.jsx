// apps/frontend/erp-portal/src/modules/inventory/components/layouts/ProductTable.jsx

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

const formatMoney = (v) => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("vi-VN");
};

// format bảo hành: ưu tiên ngày hết hạn, fallback số tháng
const formatWarranty = (p) => {
  if (p.warrantyEndDate) {
    return `Đến ${formatDate(p.warrantyEndDate)}`;
  }
  if (p.warrantyMonths) {
    return `${p.warrantyMonths} tháng`;
  }
  return "";
};

export default function ProductTable({
  data = [],

  brandMap = {},
  categoryMap = {},
  statusMap = {},
  colorMap = {}, // VD: { BLACK:"Đen", SILVER:"Bạc" }

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
            <th>Mã SP</th>
            <th>Tên sản phẩm</th>
            <th>Loại</th>
            <th>Hãng</th>
            <th>Model</th>
            <th>Màu sắc</th>
            <th>CPU</th>
            <th>RAM</th>
            <th>SSD</th>
            <th>Bảo hành</th>
            <th>Giá</th>
            <th>Tồn kho</th>
            <th>Trạng thái</th>

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
            data.map((p) => (
              <tr
                key={p.code || p.id}
                className={[
                  onRowClick && "clickable",
                  p.deletedAt && "deleted",
                  Number(p.stock) === 0 && "out-of-stock",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onRowClick?.(p)}
              >
                <td>{p.code}</td>
                <td>{p.name}</td>
                <td>{resolveMap(categoryMap, p.category)}</td>
                <td>{resolveMap(brandMap, p.brand)}</td>
                <td>{p.model}</td>
                <td>{resolveMap(colorMap, p.color)}</td>
                <td>{p.cpu}</td>
                <td>{p.ram}</td>
                <td>{p.ssd}</td>
                <td>{formatWarranty(p)}</td>
                <td>{formatMoney(p.price)}</td>
                <td>{p.stock}</td>
                <td>{resolveMap(statusMap, p.status)}</td>

                {(onView || onEdit || onDelete || renderExtraActions) && (
                  <td
                    className="actions"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    {onView && (
                      <button onClick={() => onView(p)} title="Xem">
                        <FaEye />
                      </button>
                    )}

                    {onEdit && !p.deletedAt && (
                      <button onClick={() => onEdit(p)} title="Sửa">
                        <FaEdit />
                      </button>
                    )}

                    {onDelete && !p.deletedAt && (
                      <button
                        className="danger"
                        onClick={() => onDelete(p)}
                        title="Xoá"
                      >
                        <FaTrash />
                      </button>
                    )}

                    {renderExtraActions && renderExtraActions(p)}
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
