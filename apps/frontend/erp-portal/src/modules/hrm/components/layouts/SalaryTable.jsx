// apps/frontend/erp-portal/src/modules/hrm/components/layouts/SalaryTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

// Helper định dạng tiền tệ (VNĐ)
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper định dạng ngày tháng
const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString('vi-VN');
};

export default function SalaryTable({
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
  
  // Cấu trúc cột: Nhân viên, Lương cơ bản, Phụ cấp, Lương bảo hiểm, Ngày hiệu lực, Trạng thái, (Thao tác)
  const colCount = hasActions ? 7 : 6;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Nhân viên</th>
            <th>Lương cơ bản</th>
            <th>Phụ cấp</th>
            <th>Mức lương đóng bảo hiểm</th>
            <th>Ngày hiệu lực</th>
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
              
              // Logic kiểm tra: Chỉ cho phép xoá nếu hợp đồng chưa hiệu lực hoặc ở trạng thái Dự thảo
              const isActive = d.status === "Active" || d.status === "Hiệu lực";
              const canDelete = !isActive; 

              return (
                <tr
                  key={d.id || d.code}
                  className={[
                    onRowClick && "clickable",
                    deleted && "deleted"
                  ].filter(Boolean).join(" ")}
                  onClick={() => onRowClick?.(d)}
                >
                  {/* 1. Cột Nhân viên */}
                  <td>
                    <div className="fw-bold">{d.employeeName}</div>
                    <small className="text-muted">{d.employeeCode}</small>
                  </td>

                  {/* 2. Cột Lương cơ bản */}
                  <td className="text-end">
                    {formatCurrency(d.baseSalary)}
                  </td>

                  {/* 3. Cột Phụ cấp */}
                  <td className="text-end">
                    {formatCurrency(d.allowance)}
                  </td>

                  {/* 4. Cột Mức lương đóng bảo hiểm */}
                  <td className="text-end">
                    {formatCurrency(d.insuranceSalary)}
                  </td>

                  {/* 5. Cột Ngày hiệu lực */}
                  <td>{formatDate(d.effectiveDate)}</td>

                  {/* 6. Cột Trạng thái (Giữ lại để biết hiệu lực) */}
                  <td>
                    {deleted ? (
                      <span className="badge bg-danger">Đã xoá</span>
                    ) : (
                      <span>
                        {d.statusLabel || (isActive ? "Hiệu lực" : "Dự thảo")}
                      </span>
                    )}
                  </td>

                  {/* 7. Cột Thao tác */}
                  {hasActions && (
                    <TableActions
                      data={d}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      renderExtra={renderExtraActions}
                      isDeleted={deleted}
                      canDelete={canDelete}
                      deleteTitle={
                        canDelete 
                          ? "Xoá thông tin Lương & Phúc lợi" 
                          : "Không thể xoá Lương & Phúc lợi đang áp dụng"
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