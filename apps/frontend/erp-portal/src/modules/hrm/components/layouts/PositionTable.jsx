// apps/frontend/erp-portal/src/modules/hrm/components/layouts/PositionTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export default function PositionTable({
  data = [],
  departmentMap = {},
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
  const resolve = (map, value) => map[normalizeCode(value)] || value || "";
  const hasActions = onView || onEdit || onDelete || renderExtraActions;

  const colCount = hasActions ? 8 : 7;

  const getAssignedCount = (p) =>
    typeof p.assigneeCount === "number"
      ? p.assigneeCount
      : p.assignees?.length ?? 0;

  const getCapacity = (p) => (typeof p.capacity === "number" ? p.capacity : 1);

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã chức vụ</th>
            <th>Tên chức vụ</th>
            <th>Người đảm nhận</th>
            <th>Số lượng</th>
            <th>Phòng ban</th>
            <th>Trạng thái</th>
            <th>Mô tả</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((p) => {
              const deleted = isSoftDeleted(p.deletedAt);
              const assigned = getAssignedCount(p);
              const capacity = getCapacity(p);
              const canDelete = !(assigned > 0);

              return (
                <tr
                  key={p.code}
                  className={[
                    onRowClick && "clickable",
                    deleted && "deleted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onRowClick?.(p)}
                >
                  <td>{p.code}</td>
                  <td>{p.name}</td>
                  <td>
                    {p.assignees?.length
                      ? p.assignees.map((e) => e.name).join(", ")
                      : "—"}
                  </td>
                  <td>
                    {assigned} / {capacity}
                  </td>
                  <td>{resolve(departmentMap, p.department)}</td>
                  <td>{p.status}</td>
                  <td title={p.description || ""} className="truncate">
                    {p.description || "—"}
                  </td>

                  {hasActions && (
                    <TableActions
                      data={p}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      renderExtra={renderExtraActions}
                      isDeleted={deleted}
                      // Logic riêng: Không xoá nếu đang có người đảm nhận
                      canDelete={canDelete}
                      deleteTitle={
                        !canDelete
                          ? "Không thể xoá vì đang có người đảm nhận"
                          : "Xoá"
                      }
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
