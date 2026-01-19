// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/InventoryTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

// Helper để lấy tên từ ID (Lookup)
const resolveName = (id, list, keyField = "name") => {
  if (!list || !id) return id || "-";
  const found = list.find((item) => String(item.id) === String(id));
  return found ? found[keyField] : id;
};

export default function InventoryTable({
  data = [],
  // Các danh sách tham chiếu để lookup tên
  warehouses = [],
  bins = [],
  products = [], 
  
  page = 1,
  totalPages = 1,
  onPrev,
  onNext,
  onRowClick,
  onView,
  onEdit, // Thường là điều chỉnh kho (Adjustment)
  onDelete, // Thường là xóa record khi số lượng = 0
  renderExtraActions,
}) {
  const hasActions = onView || onEdit || onDelete || renderExtraActions;

  // Cập nhật số lượng cột: Sản phẩm, Kho, Vị trí, Tồn, Cấp phát, Khả dụng, Cập nhật = 7 cột dữ liệu
  const colCount = hasActions ? 8 : 7;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Kho hàng</th>
            <th>Vị trí (Bin)</th>
            <th title="Tổng số lượng thực tế trong kho">Tồn kho</th>
            <th title="Số lượng đã được giữ cho đơn hàng">Cấp phát</th>
            <th title="Số lượng có thể bán (Tồn - Cấp phát)">Khả dụng</th>
            <th>Cập nhật cuối</th>
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
                className={onRowClick ? "clickable" : ""}
                onClick={() => onRowClick?.(item)}
              >
                {/* 1. Sản phẩm (Lookup name) */}
                <td className="font-medium">
                  {resolveName(item.product_id, products, "name")}
                </td>

                {/* 2. Kho hàng (Lookup name) */}
                <td>{resolveName(item.warehouse_id, warehouses, "name")}</td>

                {/* 3. Vị trí Bin (Lookup code) */}
                <td>
                  <span className="badge-outline">
                    {resolveName(item.bin_id, bins, "code")}
                  </span>
                </td>

                {/* 4. Tồn kho (On Hand) */}
                <td className="text-right">
                    {item.quantity_on_hand}
                </td>

                {/* 5. Cấp phát (Allocated) */}
                <td className="text-right text-warning">
                    {item.quantity_allocated}
                </td>

                {/* 6. Khả dụng (Available) - Highlight quan trọng */}
                <td className="text-right font-bold text-success">
                    {item.quantity_available}
                </td>

                {/* 7. Ngày cập nhật */}
                <td>{formatDate(item.updatedAt)}</td>

                {/* 8. Actions */}
                {hasActions && (
                  <TableActions
                    data={item}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={renderExtraActions}
                    // Inventory không có soft delete (deletedAt) trong JSON mẫu
                    // nên không cần prop isDeleted
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