// apps/frontend/erp-portal/src/modules/hrm/components/layouts/AccountTable.jsx

import {
  TablePagination,
  TableActions,
  StatusBadge,
  EmptyRow,
  formatDate } from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export default function AccountTable({
  data = [],
  departmentMap = {},
  positionMap = {},

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
  const colCount = hasActions ? 9 : 8;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Tên đăng nhập</th>
            <th>Tên nhân viên</th>
            <th>Email</th>
            <th>Phòng ban</th>
            <th>Chức vụ</th>
            <th>Phân quyền</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((a) => {
              const emp = a.employee || {};
              const deleted = isSoftDeleted(a.deletedAt);

              return (
                <tr
                  key={a.username}
                  className={[
                    onRowClick && "clickable",
                    deleted && "deleted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onRowClick?.(a)}
                >
                  <td>{a.username}</td>
                  <td>{emp.name || "—"}</td>
                  <td>{emp.email || "—"}</td>

                  <td>{resolve(departmentMap, emp.department || emp.departmentName) || "—"}</td>
                  <td>{resolve(positionMap, emp.position || emp.positionName) || "—"}</td>

                  <td>{a.role || "—"}</td>

                  <td>
                    <StatusBadge status={a.status} isDeleted={deleted} />
                  </td>

                  <td>{formatDate(a.createdAt)}</td>

                  {hasActions && (
                    <TableActions
                      data={a}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      renderExtra={renderExtraActions}
                      isDeleted={deleted}
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
