// apps/frontend/erp-portal/src/modules/hrm/components/layouts/TimeKeepingTable.jsx

import {
  TablePagination,
  EmptyRow
} from "../common/TableComponents";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";
import { FaEye, FaPen, FaBan } from "react-icons/fa"; 

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
  // Tính toán số cột
  const hasActions = onView || onEdit || onDelete || renderExtraActions;
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
              const canEdit = true; 
              
              return (
                <tr
                  key={d.id || d.code}
                  className={[
                    onRowClick && "clickable",
                    deleted && "deleted"
                  ].filter(Boolean).join(" ")}
                  onClick={() => onRowClick?.(d)}
                >
                  <td>
                    <div className="fw-500">{d.employeeName}</div>
                    <small className="text-muted">{d.employeeCode}</small>
                  </td>
                  <td>{d.departmentName || "—"}</td>
                  <td>{d.positionName || "—"}</td>
                  <td className="text-nowrap">{d.checkInTime || "—"}</td>
                  <td className="text-nowrap">{d.checkOutTime || "—"}</td>
                  
                  {/* Cột trạng thái */}
                  <td>
                    <span className={`status-badge ${d.status === "Đã hủy" ? "status-inactive" : "status-active"}`}>
                        {d.status || "—"}
                    </span>
                  </td>
                  
                  <td className="fw-bold">{d.workCount ?? 0}</td>

                  {/* CỘT THAO TÁC */}
                  {hasActions && (
                    <td className="action-col">
                       <div className="actions" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          
                          {/* 1. Nút Xem */}
                          {onView && (
                            <button 
                                className="btn-view" 
                                title="Xem chi tiết"
                                onClick={(e) => { e.stopPropagation(); onView(d); }}
                            >
                                <FaEye />
                            </button>
                          )}

                          {/* 2. Nút Sửa */}
                          {onEdit && canEdit && !deleted && (
                             <button 
                                className="btn-edit" 
                                title="Chỉnh sửa"
                                onClick={(e) => { e.stopPropagation(); onEdit(d); }}
                             >
                                <FaPen />
                             </button>
                          )}
                          
                          {/* 3. Nút Hủy công (Chỉ hiện khi chưa xóa) */}
                          {onDelete && canEdit && !deleted && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(d); }}
                                title="Hủy công"
                                className="btn-delete"
                                style={{ color: "#d97706" }} // Màu cam
                            >
                                <FaBan />
                            </button>
                          )}

                          {/* === QUAN TRỌNG: Hiển thị các nút thêm (Khôi phục/Xóa vĩnh viễn) === */}
                          {renderExtraActions && renderExtraActions(d)}
                          
                       </div>
                    </td>
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