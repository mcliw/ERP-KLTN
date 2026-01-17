// apps/frontend/erp-portal/src/modules/inventory/components/layouts/InventoryTable.jsx

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

export default function InventoryTable({
  data = [],

  // Map mã -> tên hiển thị
  itemTypeMap = {}, // VD: { PRODUCT:"Hàng hoá", ASSET:"Tài sản" }
  warehouseMap = {}, // VD: { KHO001:"Kho Tổng HCM" }
  categoryMap = {}, // VD: { LAPTOP:"Laptop", PC:"PC", OFFICE:"Văn phòng" }
  unitMap = {}, // VD: { PCS:"Cái", BOX:"Hộp" }
  statusMap = {}, // VD: { AVAILABLE:"Sẵn sàng", RESERVED:"Đã giữ", DAMAGED:"Hư hỏng" }
  conditionMap = {}, // VD: { NEW:"Mới", GOOD:"Tốt", FAIR:"Khá", POOR:"Kém" } (hay dùng cho ASSET)

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

  const getItemCode = (x) => x.itemCode || x.code || x.sku || x.id;
  const getItemName = (x) => x.itemName || x.name || "";
  const getWarehouse = (x) => x.warehouseCode || x.warehouse || "";
  const getCategory = (x) => x.category || x.itemCategory || "";
  const getUnit = (x) => x.unit || x.uom || "";
  const getQty = (x) =>
    x.quantity ?? x.qty ?? (x.itemType === "ASSET" ? 1 : 0);

  // Asset thường quản lý theo serial/tag; Product thường theo SKU
  const getSerialOrTag = (x) => x.serial || x.assetTag || x.batchNo || "";

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Loại</th>
            <th>Mã</th>
            <th>Tên</th>
            <th>Danh mục</th>
            <th>Kho</th>
            <th>Serial/Tag/Lô</th>
            <th>ĐVT</th>
            <th>Số lượng</th>
            <th>Giá trị</th>
            <th>Trạng thái</th>
            <th>Tình trạng</th>
            <th>Cập nhật</th>

            {(onView || onEdit || onDelete || renderExtraActions) && (
              <th className="action-col">Thao tác</th>
            )}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={13} className="empty">
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            data.map((x) => (
              <tr
                key={x.id || `${getItemCode(x)}-${getWarehouse(x)}-${getSerialOrTag(x)}`}
                className={[
                  onRowClick && "clickable",
                  x.deletedAt && "deleted",
                  Number(getQty(x)) === 0 && "out-of-stock",
                  x.status === "DAMAGED" && "danger-row",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onRowClick?.(x)}
              >
                <td>{resolveMap(itemTypeMap, x.itemType)}</td>
                <td>{getItemCode(x)}</td>
                <td>{getItemName(x)}</td>
                <td>{resolveMap(categoryMap, getCategory(x))}</td>
                <td>{resolveMap(warehouseMap, getWarehouse(x))}</td>
                <td>{getSerialOrTag(x)}</td>
                <td>{resolveMap(unitMap, getUnit(x))}</td>
                <td>{getQty(x)}</td>
                <td>{formatMoney(x.totalValue ?? x.value ?? x.unitPrice)}</td>
                <td>{resolveMap(statusMap, x.status)}</td>
                <td>{resolveMap(conditionMap, x.condition)}</td>
                <td>{formatDate(x.updatedAt)}</td>

                {(onView || onEdit || onDelete || renderExtraActions) && (
                  <td className="actions" onClick={(ev) => ev.stopPropagation()}>
                    {onView && (
                      <button onClick={() => onView(x)} title="Xem">
                        <FaEye />
                      </button>
                    )}

                    {onEdit && !x.deletedAt && (
                      <button onClick={() => onEdit(x)} title="Sửa">
                        <FaEdit />
                      </button>
                    )}

                    {onDelete && !x.deletedAt && (
                      <button
                        className="danger"
                        onClick={() => onDelete(x)}
                        title="Xoá"
                      >
                        <FaTrash />
                      </button>
                    )}

                    {renderExtraActions && renderExtraActions(x)}
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
