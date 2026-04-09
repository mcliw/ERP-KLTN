// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/PurchaseOrderTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

// Hàm chuẩn hóa key để map dữ liệu
const normalizeCode = (v) => String(v || "").trim();

// Helper định dạng tiền tệ (VND)
const formatCurrency = (value) => {
  if (value === undefined || value === null) return "0 ₫";
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper tô màu trạng thái dựa trên dữ liệu JSON PO
const getStatusClass = (status) => {
  switch (status) {
    case "APPROVED": return "text-success font-weight-bold";
    case "REJECTED": return "text-danger";
    case "CANCELLED": return "text-muted";
    case "PENDING": return "text-warning font-weight-bold";
    case "COMPLETED": return "text-info font-weight-bold"; // Trạng thái hoàn thành nhập kho
    default: return "text-secondary";
  }
};

export default function PurchaseOrderTable({
  data = [],
  supplierMap = {},   // Map ID NCC -> Tên NCC
  quotationMap = {},  // Map ID Báo giá -> Mã RFQ/Quotation Code
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
  
  // Hàm resolve thông tin từ ID hoặc Object expand
  const resolve = (map, value, field = 'name') => {
    if (typeof value === 'object' && value !== null) {
        // Ưu tiên trả về name (NCC) hoặc rfq_code (Báo giá)
        return value[field] || value.rfq_code || value.name || "---";
    }
    return map[normalizeCode(value)] || value || "---";
  };

  const hasActions = onView || onEdit || onDelete || renderExtraActions;

  // Columns: Mã PO, Tham chiếu Báo giá, NCC, Ngày đặt, Dự kiến giao, Thuế, Tổng tiền, Trạng thái
  const colCount = hasActions ? 9 : 8;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã PO</th>
            <th>Mã Báo giá (RFQ)</th>
            <th>Nhà cung cấp</th>
            <th>Ngày đặt hàng</th>
            <th>Dự kiến giao</th>
            <th className="text-right">Thuế (VAT)</th>
            <th className="text-right">Tổng thanh toán</th>
            <th>Trạng thái</th>
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
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                {/* 1. Mã PO */}
                <td className="font-weight-bold text-primary">{item.po_code}</td>

                {/* 2. Mã Báo giá gốc (Resolve từ ID hoặc expand object) */}
                <td>
                  <span className="badge badge-outline-info">
                    {resolve(quotationMap, item.quotation_id || item.quotation, 'rfq_code')}
                  </span>
                </td>
                
                {/* 3. Nhà cung cấp */}
                <td>{resolve(supplierMap, item.supplier_id || item.supplier, 'name')}</td>
                
                {/* 4. Ngày đặt hàng */}
                <td>{formatDate(item.order_date)}</td>
                
                {/* 5. Ngày dự kiến giao */}
                <td>{formatDate(item.expected_delivery_date)}</td>

                {/* 6. Thuế (Hiển thị số tiền thuế) */}
                <td className="text-right text-muted">
                    {formatCurrency(item.tax_amount)}
                </td>

                {/* 7. Tổng tiền (Bao gồm thuế, sau chiết khấu) */}
                <td className="text-right font-weight-bold text-dark">
                    {formatCurrency(item.total_amount)}
                </td>

                {/* 8. Trạng thái */}
                <td className={getStatusClass(item.status)}>
                  <div className="d-flex align-items-center">
                    <span className="dot mr-2"></span>
                    {item.status}
                  </div>
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
                    // Khóa sửa/xóa nếu PO đã được duyệt hoặc hoàn thành
                    disableEdit={item.status === "APPROVED" || item.status === "COMPLETED"}
                    disableDelete={item.status === "APPROVED" || item.status === "COMPLETED"}
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