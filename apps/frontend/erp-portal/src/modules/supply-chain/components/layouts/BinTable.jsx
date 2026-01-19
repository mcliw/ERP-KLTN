// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/BinTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

export default function BinTable({
  data = [],
  warehouses = [], // Nhận thêm danh sách kho để map ID -> Name
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

  const colCount = hasActions ? 6 : 5;

  const renderStatus = (isActive) => {
    return isActive ? (
      <span className="badge badge-success">Hoạt động</span>
    ) : (
      <span className="badge badge-secondary">Ngừng hoạt động</span>
    );
  };

  // Helper để lấy tên kho từ ID
  const getWarehouseName = (warehouseId) => {
    if (!warehouseId) return "-";
    const warehouse = warehouses.find(w => String(w.id) === String(warehouseId));
    return warehouse ? warehouse.name : `Kho #${warehouseId}`;
  };

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã vị trí</th>
            <th>Thuộc kho</th>
            <th>Sức chứa</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
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
                  // Kiểm tra soft delete
                  isSoftDeleted(item.deletedAt) && "deleted"
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                <td className="font-bold">{item.code}</td>
                
                {/* Hiển thị tên kho thay vì ID */}
                <td className="truncate-text" title={getWarehouseName(item.warehouse_id)}>
                    {getWarehouseName(item.warehouse_id)}
                </td>

                <td>
                    {/* Format số có dấu phẩy nếu số lớn, hoặc hiển thị mặc định */}
                    {item.max_capacity ? item.max_capacity.toLocaleString() : "0"}
                </td>
                <td>{renderStatus(item.is_active)}</td>

                <td>{formatDate(item.createdAt)}</td>

                {hasActions && (
                  <TableActions
                    data={item}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={renderExtraActions}
                    // Kiểm tra soft delete để hiển thị nút Restore/Delete vĩnh viễn
                    isDeleted={isSoftDeleted(item.deletedAt)}
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