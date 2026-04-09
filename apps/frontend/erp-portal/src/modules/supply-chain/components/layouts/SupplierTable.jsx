// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/SupplierTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  // formatDate // Tạm thời không dùng formatDate vì không có trường ngày tháng cần hiển thị ở list
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

export default function SupplierTable({
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

  // Số lượng cột: 8 cột dữ liệu + 1 cột thao tác (nếu có)
  const colCount = hasActions ? 9 : 8;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã NCC</th>
            <th>Tên nhà cung cấp</th>
            <th>Mã số thuế</th>
            <th>Email liên hệ</th>
            <th>SĐT</th>
            <th>Địa chỉ</th>
            <th>Đánh giá</th>
            <th>Trạng thái</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((s) => (
              <tr
                key={s.code}
                className={[
                  onRowClick && "clickable",
                  isSoftDeleted(s.deletedAt) && "deleted",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onRowClick?.(s)}
              >
                <td>{s.code}</td>
                <td style={{ maxWidth: "200px" }} title={s.name}>
                  {s.name}
                </td>
                <td>{s.taxCode}</td>
                <td>{s.contactEmail}</td>
                <td>{s.contactPhone}</td>
                <td style={{ maxWidth: "250px" }} className="truncate" title={s.address}>
                  {s.address}
                </td>
                <td className="text-center">
                  {s.rating ? `${s.rating} ⭐` : "-"}
                </td>
                <td>{s.status}</td>

                {hasActions && (
                  <TableActions
                    data={s}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={renderExtraActions}
                    isDeleted={isSoftDeleted(s.deletedAt)}
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