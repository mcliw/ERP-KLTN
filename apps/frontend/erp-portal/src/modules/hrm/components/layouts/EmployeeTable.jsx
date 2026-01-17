// apps/frontend/erp-portal/src/modules/hrm/components/layouts/EmployeeTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../common/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export default function EmployeeTable({
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

  const colCount = hasActions ? 11 : 10;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã NV</th>
            <th>Họ tên</th>
            <th>Giới tính</th>
            <th>Ngày sinh</th>
            <th>Email</th>
            <th>SĐT</th>
            <th>Phòng ban</th>
            <th>Chức vụ</th>
            <th>Ngày vào</th>
            <th>Trạng thái</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((e) => (
              <tr
                key={e.code}
                className={[
                  onRowClick && "clickable",
                  isSoftDeleted(e.deletedAt) && "deleted"
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(e)}
              >
                <td>{e.code}</td>
                <td>{e.name}</td>
                <td>{e.gender}</td>
                <td>{formatDate(e.dob)}</td>
                <td>{e.email}</td>
                <td>{e.phone}</td>
                <td>{resolve(departmentMap, e.department)}</td>
                <td>{resolve(positionMap, e.position)}</td>
                <td>{formatDate(e.joinDate)}</td>
                <td>{e.status}</td>

                {hasActions && (
                  <TableActions
                    data={e}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={renderExtraActions}
                    isDeleted={isSoftDeleted(e.deletedAt)}
                  />
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <TablePagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} />
    </>
  );
}
