// apps/frontend/erp-portal/src/modules/finance/components/layouts/PostingRulesTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow,
} from "../../../../shared/components/TableComponents";

// Helper map phân hệ nguồn sang tiếng Việt
const MODULE_LABELS = {
  SUPPLYCHAIN: "Chuỗi cung ứng",
  SALES: "Bán hàng",
  HRM: "Nhân sự",
  GENERAL: "Tổng hợp",
};

// Map màu sắc cho badge phân hệ để dễ nhìn hơn
const MODULE_COLORS = {
  SUPPLYCHAIN: "info",   // Xanh dương nhạt
  SALES: "success",     // Xanh lá
  HRM: "warning", // Vàng cam
  GENERAL: "secondary", // Xám
};

export default function PostingRulesTable({
  data = [],
  accountMap = {}, // Map quan trọng: { [id]: { account_code, account_name } }
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
  // Hàm resolve hiển thị thông tin tài khoản (Code - Name)
  const resolveAccount = (id) => {
    if (!id) return "—";
    const acc = accountMap[id];
    if (!acc) return <span className="text-danger">ID: {id} (Không tìm thấy)</span>;
    
    // Hiển thị dạng: 111 - Tiền mặt
    return `${acc.account_code} - ${acc.account_name}`;
  };

  const hasActions = onView || onEdit || onDelete || renderExtraActions;
  
  // Xác định dòng đã bị "xóa mềm" (inactive)
  const isRowInactive = (item) => item.is_active === false;

  // Cập nhật số lượng cột: Mã SK, Diễn giải, Phân hệ, TK Nợ, TK Có = 5 cột dữ liệu + Actions
  const colCount = hasActions ? 6 : 5;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th style={{ width: "15%" }}>Mã sự kiện</th>
            <th style={{ width: "25%" }}>Diễn giải</th>
            <th style={{ width: "15%" }}>Phân hệ</th>
            <th style={{ width: "20%" }}>Tài khoản Nợ</th>
            <th style={{ width: "20%" }}>Tài khoản Có</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((item) => (
              <tr
                // Ưu tiên dùng id, fallback sang rule_id
                key={item.id || item.rule_id}
                // Thêm class "deleted" nếu item inactive để làm mờ dòng
                className={[
                  onRowClick ? "clickable" : "",
                  isRowInactive(item) ? "deleted" : "" 
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}
              >
                {/* Mã sự kiện: In đậm để dễ nhận diện */}
                <td className="font-medium text-primary">
                  {item.event_code}
                </td>

                <td>{item.event_description}</td>

                {/* Badge phân hệ */}
                <td>{MODULE_LABELS[item.module_source] || item.module_source}</td>

                {/* Tài khoản Nợ */}
                <td className="font-medium">
                   {resolveAccount(item.debit_account_id)}
                </td>

                {/* Tài khoản Có */}
                <td className="font-medium">
                   {resolveAccount(item.credit_account_id)}
                </td>

                {hasActions && (
                  <TableActions
                    data={item}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    renderExtra={renderExtraActions}
                    // [CẬP NHẬT] Truyền trạng thái đã xóa xuống để Action xử lý (VD: Ẩn nút Edit)
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