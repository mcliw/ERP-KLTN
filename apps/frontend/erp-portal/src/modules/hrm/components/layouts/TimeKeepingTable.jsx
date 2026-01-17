// apps/frontend/erp-portal/src/modules/hrm/components/layouts/TimeKeepingTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow
} from "../common/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

export default function TimeKeepingTable({
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
  // Số lượng cột hiển thị (7 cột dữ liệu + 1 cột thao tác nếu có)
  const colCount = hasActions ? 8 : 7;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Tên nhân viên</th>
            <th>Phòng ban</th>
            <th>Chức vụ</th>
            <th>Giờ vào</th>
            <th>Giờ ra</th>
            <th>Trạng thái công</th>
            <th>Số công</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((d) => {
              const deleted = isSoftDeleted(d.deletedAt);
              
              // Giả định logic: Không thể sửa/xóa nếu trạng thái công đã chốt (ví dụ: isLocked)
              // Bạn có thể tùy chỉnh logic này theo nghiệp vụ thực tế
              const canEdit = !d.isLocked; 
              const canDelete = !d.isLocked; 

              return (
                <tr
                  key={d.id || d.code} // Sử dụng ID duy nhất của bản ghi chấm công
                  className={[
                    onRowClick && "clickable",
                    deleted && "deleted"
                  ].filter(Boolean).join(" ")}
                  onClick={() => onRowClick?.(d)}
                >
                  {/* Tên nhân viên */}
                  <td>
                    <div className="fw-500">{d.employeeName}</div>
                    <small className="text-muted">{d.employeeCode}</small>
                  </td>
                  
                  {/* Phòng ban */}
                  <td>{d.departmentName || "—"}</td>
                  
                  {/* Chức vụ */}
                  <td>{d.positionName || "—"}</td>
                  
                  {/* Giờ vào */}
                  <td className="text-nowrap">{d.checkInTime || "—"}</td>
                  
                  {/* Giờ ra */}
                  <td className="text-nowrap">{d.checkOutTime || "—"}</td>
                  
                  {/* Trạng thái công */}
                  <td>
                    {/* Render badge màu sắc tùy theo trạng thái nếu cần */}
                    <span className={`status-badge status-${d.statusKey || 'default'}`}>
                        {d.status || "—"}
                    </span>
                  </td>
                  
                  {/* Số công */}
                  <td className="fw-bold">{d.workCount ?? 0}</td>

                  {hasActions && (
                    <TableActions
                      data={d}
                      onView={onView}
                      onEdit={canEdit ? onEdit : undefined} // Disable edit nếu bị khóa
                      onDelete={canDelete ? onDelete : undefined} // Disable delete nếu bị khóa
                      renderExtra={renderExtraActions}
                      isDeleted={deleted}
                      canDelete={canDelete}
                      deleteTitle={
                        canDelete ? "Xoá" : "Không thể xoá bản ghi đã chốt"
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