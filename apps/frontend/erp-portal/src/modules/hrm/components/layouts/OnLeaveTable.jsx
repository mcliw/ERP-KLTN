// apps/frontend/erp-portal/src/modules/hrm/components/layouts/OnLeaveTable.jsx

import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";

import {
  TablePagination,
  TableActions,
  StatusBadge,
  EmptyRow,
  formatDate,
} from "../../../../shared/components/TableComponents";

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export default function OnLeaveTable({
  data = [],
  // chuẩn hoá giống EmployeeTable: nhận map để resolve tên theo code (nếu muốn)
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
  const { user } = useAuthStore();

  const resolve = (map, value) => map[normalizeCode(value)] || value || "";
  const hasActions = onView || onEdit || onDelete || renderExtraActions;
  const colCount = hasActions ? 10 : 9;

  const handleRowClick = (e, row) => {
    const inActionCol = e.target.closest?.(".action-col");
    const inButtonOrLink = e.target.closest?.("button, a");
    if (inActionCol || inButtonOrLink) return;

    onRowClick?.(row);
  };

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã NV</th>
            <th>Họ tên</th>
            <th>Phòng ban</th>
            <th>Chức vụ</th>
            <th>Loại nghỉ</th>
            <th>Từ ngày</th>
            <th>Đến ngày</th>
            <th>Lý do</th>
            <th>Trạng thái</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((o) => {
              const deleted = isSoftDeleted(o.deletedAt);

              const statusLower = String(o.status || "").toLowerCase();
              const isPending = statusLower === "chờ duyệt";
              const isManager = HRM_PERMISSIONS.HRM_LEAVE_UPDATE.includes(user?.role);
              const canEditOrDelete = isManager || isPending;

              return (
                <tr
                  key={o.id}
                  className={[
                    onRowClick && "clickable",
                    deleted && "deleted",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={(e) => handleRowClick(e, o)}
                >
                  <td>{o.employeeCode || "-"}</td>
                  <td>{o.employeeName || "-"}</td>

                  {/* Chuẩn hoá: nếu backend trả code thì resolve bằng map, nếu đã là name thì vẫn hiển thị */}
                  <td>{resolve(departmentMap, o.departmentCode || o.departmentName)}</td>
                  <td>{resolve(positionMap, o.positionCode || o.positionName)}</td>

                  <td>{o.leaveType || "-"}</td>
                  <td>{formatDate(o.fromDate)}</td>
                  <td>{formatDate(o.toDate)}</td>
                  <td>{o.reason || "—"}</td>

                  <td>
                    <StatusBadge status={o.status} isDeleted={deleted} />
                  </td>

                  {hasActions && (
                    <TableActions
                      data={o}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      renderExtra={renderExtraActions}
                      isDeleted={deleted}
                      canEdit={canEditOrDelete}
                      canDelete={canEditOrDelete}
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
