// apps/frontend/erp-portal/src/modules/sales/components/layouts/OrderTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export default function OrderTable({
  data = [],
  customerMap = {}, 
  statusMap = {},
  page = 1,
  totalPages = 1,
  onPrev,
  onNext,
  onRowClick,
  onView,
  // Đã bỏ onEdit, onDelete
}) {
  const resolveCustomer = (map, value) => map[normalizeCode(value)] || value || "";
  const resolveStatus = (val) => statusMap[val] || val;

  // Cột: ID, Khách hàng, Phương thức TT, Địa chỉ, Ngày tạo, Trạng thái = 6 cột
  // Nếu có onView thì thêm cột thao tác (chỉ dùng để xem chi tiết)
  const hasActions = !!onView;
  const colCount = hasActions ? 7 : 6;

  const isCancelled = (status) => status === "CANCELLED";

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Khách hàng</th>
            <th>Thanh toán</th>
            <th>Địa chỉ giao hàng</th>
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
              const cancelled = isCancelled(item.order_status);
              
              return (
                <tr
                  key={item.id}
                  className={[
                    onRowClick && "clickable",
                    cancelled && "deleted" // Giữ style mờ cho đơn đã hủy (nếu CSS "deleted" chỉ làm mờ)
                  ].filter(Boolean).join(" ")}
                  onClick={() => onRowClick?.(item)}
                >
                  <td>{item.id}</td>
                  <td>{resolveCustomer(customerMap, item.customer_id)}</td>
                  <td>{item.payment_method}</td>
                  <td title={item.shipping_address}>
                    {item.shipping_address}
                  </td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    <span className={`status-badge status-${item.order_status?.toLowerCase()}`}>
                      {resolveStatus(item.order_status)}
                    </span>
                  </td>

                  {hasActions && (
                    <TableActions
                      data={item}
                      onView={onView}
                      // Không truyền onEdit, onDelete
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