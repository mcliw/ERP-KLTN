// apps/frontend/erp-portal/src/modules/finance/components/layouts/PaymentSlipTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

// Helper format tiền tệ
const formatCurrency = (value) => {
  if (!value) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export default function PaymentSlipTable({
  data = [],
  page = 1,
  totalPages = 1,
  onPrev,
  onNext,
  onRowClick,
  onView,
  onEdit,
  onDelete,
  onRestore,
  renderExtraActions,
}) {
  const hasActions = onView || onEdit || onDelete || renderExtraActions;

  // Cột: Số phiếu, Ngày, NCC, Số tiền, TK Nợ, TK Có, Đơn mua tham chiếu
  const colCount = hasActions ? 8 : 7;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Số phiếu chi</th>
            <th>Ngày chứng từ</th>
            <th>Nhà cung cấp</th>
            <th>Số tiền chi</th>
            <th>TK Nợ</th>
            <th>TK Có</th>
            <th>Đơn mua (PO)</th>
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
                  isSoftDeleted(item.deleted_at) && "deleted"
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                {/* 1. Số phiếu */}
                <td className="font-bold">{item.id}</td>

                {/* 2. Ngày tạo/hạch toán */}
                <td>{formatDate(item.transaction_date || item.created_at)}</td>

                {/* 3. Nhà cung cấp */}
                <td>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.supplier_name || "---"}</span>
                    {/* Hiển thị ID để đối chiếu */}
                    {item.partner_id && (
                        <span className="text-xs text-gray-400">{item.partner_id}</span>
                    )}
                  </div>
                </td>

                {/* 4. Số tiền - Màu đỏ hoặc cam để thể hiện dòng tiền ra */}
                <td className="font-bold text-danger">
                  {formatCurrency(item.amount)}
                </td>

                {/* 5. TK Nợ (331) */}
                <td>{item.debit_account_code}</td>

                {/* 6. TK Có (111/112) */}
                <td>{item.credit_account_code}</td>

                {/* 7. Đơn mua hàng tham chiếu */}
                <td>
                    <div className="flex flex-col gap-1">
                        {item.purchase_orders_info && item.purchase_orders_info.length > 0 ? (
                            item.purchase_orders_info.map((po, index) => (
                                <span key={index} className="text-sm bg-gray-100 px-2 py-0.5 rounded border border-gray-200 w-fit">
                                    {po.code || po.id}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                    </div>
                </td>

                {/* 8. Hành động */}
                {hasActions && (
                  <TableActions
                    data={item}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={(item) => (
                        <>
                            {renderExtraActions?.(item)}
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