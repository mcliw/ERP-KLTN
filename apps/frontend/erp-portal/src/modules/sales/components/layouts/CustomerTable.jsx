// apps/frontend/erp-portal/src/modules/sales/components/layouts/CustomerTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

export default function CustomerTable({
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

  // Cập nhật số lượng cột: Mã, Tên, SĐT, Email, Địa chỉ, Ngày tạo, Trạng thái = 7 cột dữ liệu
  const colCount = hasActions ? 8 : 7;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã KH</th>
            <th>Họ và tên</th>
            <th>Số điện thoại</th>
            <th>Email</th>
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
                  // Lưu ý: JSON data dùng 'deleted_at', cần khớp với property trong object
                  isSoftDeleted(item.deleted_at) && "deleted"
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                <td>{item.code}</td>
                <td className="font-medium">{item.full_name}</td>
                <td>{item.phone}</td>
                <td>{item.email}</td>
                {/* Giới hạn hiển thị địa chỉ nếu quá dài bằng CSS (nếu cần), ở đây hiển thị full */}
                <td>{item.address}</td>
                
                {/* JSON data dùng 'created_at' */}
                <td>{formatDate(item.created_at)}</td>
                
                {/* Hiển thị trạng thái. Có thể thêm logic đổi màu badge tại đây nếu cần */}
                <td>{item.status}</td>

                {hasActions && (
                  <TableActions
                    data={item}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={renderExtraActions}
                    // Truyền trạng thái đã xóa để ẩn/hiện nút phù hợp
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