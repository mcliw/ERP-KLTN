// apps/frontend/erp-portal/src/modules/finance/components/layouts/FaAccountTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

// Helper map trạng thái và loại tài khoản sang tiếng Việt
const TYPE_LABELS = {
  ASSET: "Tài sản",
  LIABILITY: "Nợ phải trả",
  EQUITY: "Vốn chủ sở hữu",
  REVENUE: "Doanh thu",
  EXPENSE: "Chi phí",
};

export default function FaAccountTable({
  data = [],
  accountMap = {}, // Map dùng để tra cứu parent_account_id -> account_code (hoặc name)
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
  // Hàm resolve hiển thị thông tin TK cha (ưu tiên hiển thị Code - Name hoặc chỉ Code)
  const resolveParent = (id) => {
    if (!id) return "";
    return accountMap[id] || id; 
  };

  const hasActions = onView || onEdit || onDelete || renderExtraActions;

  // Cập nhật số lượng cột: Mã, Tên, Loại, Cha, Ngày tạo, Trạng thái = 6 cột dữ liệu
  const colCount = hasActions ? 7 : 6;

  // Xác định dòng đã bị "xóa mềm" (inactive)
  const isRowInactive = (item) => item.is_active === false;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th>Số hiệu TK</th>
            <th>Tên tài khoản</th>
            <th>Loại tài khoản</th>
            <th>Tài khoản cha</th>
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
                // Lưu ý: JSON dùng account_id làm khóa chính
                key={item.account_id}
                className={[
                  onRowClick && "clickable",
                  isRowInactive(item) && "deleted" // Class "deleted" thường làm mờ dòng
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                {/* Hiển thị account_code (Số hiệu) thay vì ID database */}
                <td className="font-medium">{item.account_code}</td>
                
                <td>{item.account_name}</td>
                
                {/* Mapping loại tài khoản sang tiếng Việt */}
                <td>
                  <span className={`badge badge-${(item.account_type || "").toLowerCase()}`}>
                    {TYPE_LABELS[item.account_type] || item.account_type}
                  </span>
                </td>

                {/* Resolve Parent ID */}
                <td>{resolveParent(item.parent_account_id)}</td>

                <td>{formatDate(item.created_at)}</td>

                <td>
                  {item.is_active ? (
                    <span className="text-success">Hoạt động</span>
                  ) : (
                    <span className="text-muted">Ngừng hoạt động</span>
                  )}
                </td>

                {hasActions && (
                  <TableActions
                    data={item}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={renderExtraActions}
                    // Truyền cờ isDeleted để TableActions hiển thị nút Restore (nếu có logic đó)
                    isDeleted={isRowInactive(item)}
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