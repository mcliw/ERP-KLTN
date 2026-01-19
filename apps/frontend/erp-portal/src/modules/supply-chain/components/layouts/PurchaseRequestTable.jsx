// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/PurchaseRequestTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

// Hàm chuẩn hóa key để map dữ liệu
const normalizeCode = (v) => String(v || "").trim();

// Helper để tô màu trạng thái (tùy chọn theo UI system của bạn)
const getStatusClass = (status) => {
  switch (status) {
    case "APPROVED": return "text-success font-weight-bold";
    case "REJECTED": return "text-danger";
    case "COMPLETED": return "text-primary";
    case "CANCELLED": return "text-muted";
    default: return "text-warning"; // DRAFT
  }
};

export default function PurchaseRequestTable({
  data = [],
  requesterMap = {},  // Map ID nhân viên -> Tên nhân viên
  departmentMap = {}, // Map ID phòng ban -> Tên phòng ban
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
  // Hàm resolve giúp hiển thị tên thay vì ID (requester, department)
  // Lưu ý: data JSON dùng ID số, nên cần đảm bảo key trong Map khớp kiểu dữ liệu
  const resolve = (map, value) => map[normalizeCode(value)] || value || "---";
  
  const hasActions = onView || onEdit || onDelete || renderExtraActions;

  // Số cột: Code, Requester, Dept, Date, Reason, Status, CreatedAt = 7 cột dữ liệu
  const colCount = hasActions ? 8 : 7;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Mã phiếu</th>
            <th>Người yêu cầu</th>
            <th>Phòng ban</th>
            <th>Ngày cần hàng</th>
            <th>Lý do mua sắm</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
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
                  // Lưu ý: JSON dùng snake_case 'deletedAt'
                  isSoftDeleted(item.deletedAt) && "deleted" 
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                <td className="font-weight-bold">{item.pr_code}</td>
                
                {/* Resolve Requester ID -> Name */}
                <td>{resolve(requesterMap, item.requester_id)}</td>
                
                {/* Resolve Department ID -> Name */}
                <td>{resolve(departmentMap, item.department_id)}</td>
                
                {/* Ngày request (khác ngày tạo) */}
                <td>{formatDate(item.request_date)}</td>
                
                <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.reason}>
                  {item.reason}
                </td>

                <td className={getStatusClass(item.status)}>
                  {item.status}
                </td>

                <td>{formatDate(item.createdAt)}</td>

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