// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/ProductCategoryTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

// Hàm chuẩn hóa key để map dữ liệu (giữ nguyên logic từ EmployeeTable)
const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export default function ProductCategoryTable({
  data = [],
  categoryMap = {}, // Map dùng để tra cứu tên danh mục cha từ parentId
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
  // Hàm resolve giúp hiển thị tên danh mục cha thay vì ID
  const resolve = (map, value) => map[normalizeCode(value)] || value || "";
  
  const hasActions = onView || onEdit || onDelete || renderExtraActions;

  // Cập nhật số lượng cột: ID, Tên, Cha, Mô tả, Ngày tạo, Trạng thái = 6 cột dữ liệu
  const colCount = hasActions ? 7 : 6;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã danh mục</th>
            <th>Tên danh mục</th>
            <th>Danh mục cha</th>
            <th>Mô tả</th>
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
                  isSoftDeleted(item.deletedAt) && "deleted"
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                <td>{item.id}</td>
                <td>{item.name}</td>
                {/* Hiển thị tên danh mục cha dựa vào map, nếu không có parentId thì để trống */}
                <td>{resolve(categoryMap, item.parentId)}</td>
                <td>{item.description}</td>
                <td>{formatDate(item.createdAt)}</td>
                <td>{item.status}</td>

                {hasActions && (
                  <TableActions
                    data={item}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={renderExtraActions}
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