// apps/frontend/erp-portal/src/modules/inventory/components/layouts/InventoryHistoryTable.jsx

import {
  FaCaretLeft,
  FaCaretRight,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "../styles/table.css";

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

const formatDateTime = (v) => {
  if (!v) return "";
  const d = new Date(v);
  // vi-VN: dd/mm/yyyy, HH:mm:ss
  return d.toLocaleString("vi-VN");
};

// số lượng: cho phép +/-
const formatQty = (v) => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("vi-VN");
};

export default function InventoryHistoryTable({
  data = [],

  // Map mã -> tên hiển thị
  transactionTypeMap = {}, // VD: { IN:"Nhập kho", OUT:"Xuất kho", TRANSFER:"Điều chuyển", ADJUST:"Điều chỉnh", CHECK:"Kiểm kê", ALLOCATE:"Cấp phát", RETURN:"Thu hồi" }
  documentTypeMap = {}, // VD: { GRN:"Phiếu nhập", GDN:"Phiếu xuất", TRF:"Phiếu điều chuyển" }
  userMap = {}, // VD: { E001:"Nguyễn Văn A" }

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

  // chứng từ: cho phép hiển thị dạng "Phiếu nhập - PN0001"
  const renderDocument = (h) => {
    const docType = resolveMap(documentTypeMap, h.documentType);
    const docNo = h.documentNo || h.documentCode || h.voucherNo || "";
    if (!docType && !docNo) return "";
    if (docType && docNo) return `${docType} - ${docNo}`;
    return docType || docNo;
  };

  // người thao tác: ưu tiên tên
  const renderUser = (h) => {
    return (
      h.createdByName ||
      resolveMap(userMap, h.createdBy) ||
      h.userName ||
      h.user ||
      ""
    );
  };

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Loại giao dịch</th>
            <th>Số lượng</th>
            <th>Chứng từ</th>
            <th>Người thao tác</th>

            {(onView || onEdit || onDelete || renderExtraActions) && (
              <th className="action-col">Thao tác</th>
            )}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty">
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            data.map((h) => (
              <tr
                key={h.id || `${h.at || h.createdAt}-${h.documentNo || ""}-${h.qty}`}
                className={[
                  onRowClick && "clickable",
                  h.deletedAt && "deleted",
                  // tuỳ chọn: qty âm -> đánh dấu
                  Number(h.qty) < 0 && "danger-row",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onRowClick?.(h)}
              >
                <td>{formatDateTime(h.at || h.createdAt || h.time)}</td>
                <td>{resolveMap(transactionTypeMap, h.transactionType)}</td>
                <td>{formatQty(h.qty ?? h.quantity)}</td>
                <td>{renderDocument(h)}</td>
                <td>{renderUser(h)}</td>

                {(onView || onEdit || onDelete || renderExtraActions) && (
                  <td className="actions" onClick={(ev) => ev.stopPropagation()}>
                    {onView && (
                      <button onClick={() => onView(h)} title="Xem">
                        <FaEye />
                      </button>
                    )}

                    {onEdit && !h.deletedAt && (
                      <button onClick={() => onEdit(h)} title="Sửa">
                        <FaEdit />
                      </button>
                    )}

                    {onDelete && !h.deletedAt && (
                      <button
                        className="danger"
                        onClick={() => onDelete(h)}
                        title="Xoá"
                      >
                        <FaTrash />
                      </button>
                    )}

                    {renderExtraActions && renderExtraActions(h)}
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
