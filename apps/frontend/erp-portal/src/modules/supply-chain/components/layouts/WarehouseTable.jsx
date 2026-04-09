// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/WarehouseTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

const TYPE_LABELS = {
  CENTRAL: "Kho Trung Tâm",
  LOCAL: "Kho Địa Phương",
  TRANSIT: "Kho Trung Chuyển",
  BONDED: "Kho Ngoại Quan",
  RETAIL: "Cửa Hàng Bán Lẻ",
};

export default function WarehouseTable({
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

  // Cập nhật số lượng cột: Mã, Tên, Loại, Địa chỉ, Ngày tạo, Trạng thái = 6 cột dữ liệu
  const colCount = hasActions ? 7 : 6;

  // Helper đơn giản để hiển thị trạng thái từ boolean
  const getStatusLabel = (isActive) => {
    return isActive ? "Hoạt động" : "Ngừng hoạt động";
  };

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã kho</th>
            <th>Tên kho</th>
            <th>Loại kho</th>
            <th>Địa chỉ</th>
            <th>Ngày tạo</th>
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
                  // Lưu ý: Dữ liệu JSON warehouse dùng 'deletedAt' (snake_case)
                  isSoftDeleted(item.deletedAt) && "deleted"
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                <td>{item.code}</td>
                <td>{item.name}</td>
                {/* Hiển thị loại kho (CENTRAL, LOCAL...) */}
                <td>{TYPE_LABELS[item.type] || item.type}</td>
                <td className="truncate-text" title={item.address}>
                  {item.address || "-"}
                </td>
                {/* Dữ liệu JSON dùng 'createdAt' */}
                <td>{formatDate(item.createdAt)}</td>
                <td>{getStatusLabel(item.is_active)}</td>

                {hasActions && (
                  <TableActions
                    data={item}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={renderExtraActions}
                    // Kiểm tra soft delete trên trường deletedAt
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