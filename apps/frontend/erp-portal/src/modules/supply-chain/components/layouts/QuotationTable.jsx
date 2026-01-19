// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/QuotationTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";
import { FaCheck, FaTimes } from "react-icons/fa";

// Hàm chuẩn hóa key để map dữ liệu
const normalizeCode = (v) => String(v || "").trim();

// Helper định dạng tiền tệ (VND)
const formatCurrency = (value) => {
  if (value === undefined || value === null) return "0 ₫";
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper tô màu trạng thái
const getStatusClass = (status) => {
  switch (status) {
    case "APPROVED": return "text-success font-weight-bold";
    case "REJECTED": return "text-danger";
    case "CANCELLED": return "text-muted";
    case "PENDING": return "text-warning font-weight-bold";
    default: return "text-secondary";
  }
};

export default function QuotationTable({
  data = [],
  supplierMap = {}, // Map ID NCC -> Tên NCC (VD: { "301": "Công ty A" })
  prMap = {},       // Map ID PR -> PR Code (VD: { "1": "PR-2023-1001" })
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
  // Hàm resolve: Ưu tiên lấy từ Map, nếu không có thì hiển thị ID gốc
  const resolve = (map, value) => {
    // Nếu dữ liệu từ API đã expand sẵn object (ví dụ item.supplier.name) thì dùng luôn
    if (typeof value === 'object' && value?.name) return value.name;
    if (typeof value === 'object' && value?.pr_code) return value.pr_code;
    
    return map[normalizeCode(value)] || value || "---";
  };

  const hasActions = onView || onEdit || onDelete || renderExtraActions;

  // Columns: RFQ Code, PR Code, Supplier, Date, Valid Until, Total Amount, Status, Selected, CreatedAt
  const colCount = hasActions ? 9 : 8;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã RFQ</th>
            <th>Mã PR</th>
            <th>Nhà cung cấp</th>
            <th>Ngày báo giá</th>
            <th>Hiệu lực đến</th>
            <th className="text-right">Tổng tiền</th>
            <th>Trạng thái</th>
            <th>Được chọn</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((item) => (
              <tr
                key={item.id}
                className={[
                  onRowClick && "clickable",
                  isSoftDeleted(item.deletedAt) && "deleted",
                  item.is_selected && "bg-light-success" // Highlight nhẹ dòng được chọn
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                {/* 1. Mã RFQ */}
                <td className="font-weight-bold">{item.rfq_code}</td>

                {/* 2. Mã PR (Resolve từ ID) */}
                <td>
                    <span className="badge badge-outline-secondary">
                        {resolve(prMap, item.pr_id || item.purchase_request)}
                    </span>
                </td>
                
                {/* 3. Nhà cung cấp (Resolve từ ID) */}
                <td>{resolve(supplierMap, item.supplier_id || item.supplier)}</td>
                
                {/* 4. Ngày báo giá */}
                <td>{formatDate(item.quotation_date)}</td>
                
                {/* 5. Hiệu lực */}
                <td>{formatDate(item.valid_until)}</td>

                {/* 6. Tổng tiền (Align Right cho số) */}
                <td className="text-right font-weight-bold">
                    {formatCurrency(item.total_amount)}
                </td>

                {/* 7. Trạng thái */}
                <td className={getStatusClass(item.status)}>
                  {item.status}
                </td>

                {/* 8. Được chọn (Is Selected) */}
                <td className="text-center" style={{textAlign: 'center'}}>
                    {item.is_selected ? (
                        <span className="text-success font-size-lg" title="Đã chọn mua">
                            <FaCheck/>
                        </span>
                    ) : (
                        <span className="text-danger"><FaTimes/></span>
                    )}
                </td>

                {/* 9. Actions */}
                {hasActions && (
                  <TableActions
                    data={item}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={renderExtraActions}
                    isDeleted={isSoftDeleted(item.deletedAt)}
                    // Khóa nút xóa/sửa nếu đã được duyệt/chọn (Logic UI bổ trợ)
                    disableEdit={item.status === "APPROVED" || item.is_selected}
                    disableDelete={item.status === "APPROVED" || item.is_selected}
                  />
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <TablePagination 
        page={page} 
        totalPages={totalPages} 
        onPrev={onPrev} 
        onNext={onNext} 
      />
    </>
  );
}