// apps/frontend/erp-portal/src/modules/sales/components/layouts/VoucherTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

// Helper format tiền tệ VNĐ
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return "---";
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function VoucherTable({
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
  const hasActions = onView || onEdit || onDelete || renderExtraActions;

  // Cột: Mã Voucher, Loại, Giá trị, Đơn tối thiểu, Ngày tạo, Trạng thái = 6 cột dữ liệu
  const colCount = hasActions ? 7 : 6;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã Voucher</th>
            <th>Loại giảm giá</th>
            <th>Giá trị giảm</th>
            <th>Đơn tối thiểu</th>
            <th>Ngày tạo</th>
            <th>Trạng thái</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((item) => {
              // Lấy thông tin từ các bảng con (do dùng _embed từ json-server hoặc join từ BE)
              // Giả định voucher_details là mảng, lấy phần tử đầu tiên làm mã chính
              const detail = item.voucher_details?.[0] || {};
              const constraint = item.voucher_constraints?.[0] || {};
              
              // Xử lý hiển thị giá trị giảm
              const isPercent = item.discount_type === "PERCENTAGE";
              const displayValue = isPercent 
                ? `${item.discount_value}%` 
                : formatCurrency(item.discount_value);

              return (
                <tr
                  key={item.id}
                  className={[
                    onRowClick && "clickable",
                    isSoftDeleted(item.deleted_at) && "deleted"
                  ].filter(Boolean).join(" ")}
                  onClick={() => onRowClick?.(item)}
                >
                  {/* Mã Voucher (Code) */}
                  <td className="font-medium text-primary">
                    {detail.code || <span className="text-gray-400">---</span>}
                  </td>

                  {/* Loại giảm giá */}
                  <td>
                    {isPercent ? "Theo %" : "Số tiền cố định"}
                  </td>

                  {/* Giá trị giảm */}
                  <td className="font-bold">
                    {displayValue}
                  </td>

                  {/* Điều kiện đơn tối thiểu */}
                  <td>
                    {constraint.min_order_amount 
                      ? formatCurrency(constraint.min_order_amount) 
                      : "Không giới hạn"}
                  </td>

                  {/* Ngày tạo */}
                  <td>{formatDate(item.created_at)}</td>

                  {/* Trạng thái - Sử dụng field 'status' đã được map từ service */}
                  <td>{item.status}</td>

                  {hasActions && (
                    <TableActions
                      data={item}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      renderExtra={renderExtraActions}
                      isDeleted={isSoftDeleted(item.deleted_at)}
                    />
                  )}
                </tr>
              );
            })
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