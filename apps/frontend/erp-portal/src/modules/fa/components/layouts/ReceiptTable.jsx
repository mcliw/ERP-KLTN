// apps/frontend/erp-portal/src/modules/sales/components/layouts/ReceiptTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

// Hàm format tiền tệ (nếu chưa có trong shared utils)
const formatCurrency = (value) => {
  if (!value) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export default function ReceiptTable({
  data = [],
  page = 1,
  totalPages = 1,
  onPrev,
  onNext,
  onRowClick,
  onView,
  onEdit,
  onDelete,
  onRestore, // Thêm prop này nếu muốn nút khôi phục hiển thị trong extra actions
  renderExtraActions,
}) {
  const hasActions = onView || onEdit || onDelete || renderExtraActions;

  // Cập nhật số lượng cột: Số phiếu, Ngày, Khách hàng, Số tiền, TK Nợ, TK Có, Đơn hàng = 7 cột dữ liệu
  const colCount = hasActions ? 8 : 7;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Số phiếu</th>
            <th>Ngày chứng từ</th>
            <th>Khách hàng</th>
            <th>Số tiền thu</th>
            <th>TK Nợ</th>
            <th>TK Có</th>
            <th>Đơn hàng</th>
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
                  // Kiểm tra trạng thái xóa mềm để bôi xám dòng
                  isSoftDeleted(item.deleted_at) && "deleted"
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                {/* Số phiếu */}
                <td className="font-bold">{item.id}</td>

                {/* Ngày tạo (hoặc ngày hạch toán nếu có field transaction_date) */}
                <td>{formatDate(item.created_at)}</td>

                {/* Khách hàng - Hiển thị ID hoặc Name nếu đã join dữ liệu */}
                <td>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.customer_name || "---"}</span>
                  </div>
                </td>

                {/* Số tiền - In đậm và format VND */}
                <td className="font-medium text-primary">
                  {formatCurrency(item.amount)}
                </td>

                {/* TK Nợ */}
                <td>{item.debit_account_code}</td>

                {/* TK Có */}
                <td>{item.credit_account_code}</td>

                {/* Đơn hàng tham chiếu */}
                <td>
                    {item.order_reference_id ? (
                        <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            {item.order_info || item.order_reference_id}
                        </span>
                    ) : "-"}
                </td>

                {hasActions && (
                  <TableActions
                    data={item}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    // Truyền thêm onRestore vào renderExtra hoặc xử lý riêng nếu component TableActions hỗ trợ
                    renderExtra={(item) => (
                        <>
                            {renderExtraActions?.(item)}
                            {/* Ví dụ: Nếu đã xóa mềm và có hàm restore thì hiện nút restore */}
                            {isSoftDeleted(item.deleted_at) && onRestore && (
                                <button 
                                    className="btn-icon restore" 
                                    title="Khôi phục"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRestore(item);
                                    }}
                                >
                                    ↺
                                </button>
                            )}
                        </>
                    )}
                    isDeleted={isSoftDeleted(item.deleted_at)}
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