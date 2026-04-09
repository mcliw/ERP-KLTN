// apps/frontend/erp-portal/src/modules/hrm/components/layouts/DepartmentTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

export default function DepartmentTable({
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
  const colCount = hasActions ? 7 : 6;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã phòng ban</th>
            <th>Tên phòng ban</th>
            <th>Trưởng phòng</th>
            <th>Mô tả</th>
            <th>Số NV</th>
            <th>Trạng thái</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((d) => {
              const deleted = isSoftDeleted(d.deletedAt);
              const employeeCount = d.employeeCount ?? 0;
              const canDelete = !(employeeCount > 0);

              return (
                <tr
                  key={d.code}
                  className={[
                    onRowClick && "clickable",
                    deleted && "deleted"
                  ].filter(Boolean).join(" ")}
                  onClick={() => onRowClick?.(d)}
                >
                  <td>{d.code}</td>
                  <td>{d.name}</td>
                  <td>{d.managerName || "—"}</td>
                  <td>{d.description || "—"}</td>
                  <td>{employeeCount}</td>
                  <td>
                    {deleted
                      ? "Đã xoá"
                      : d.status === "Ngưng hoạt động"
                      ? "Ngưng hoạt động"
                      : "Hoạt động"}
                  </td>

                  {hasActions && (
                    <TableActions
                      data={d}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      renderExtra={renderExtraActions}
                      isDeleted={deleted}
                      // Logic riêng: Không xoá nếu còn nhân viên
                      canDelete={canDelete}
                      deleteTitle={
                        canDelete ? "Xoá" : "Không thể xoá vì vẫn còn nhân viên"
                      }
                    />
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <TablePagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} />
    </>
  );
}
