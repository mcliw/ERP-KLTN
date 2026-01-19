import React from "react";
import {
  TablePagination,
  TableActions,
  EmptyRow,
  formatDate
} from "../../../../shared/components/TableComponents";

import { isSoftDeleted } from "../../../../shared/utils/softDelete";

// Hàm chuẩn hóa mã để tìm kiếm trong Map không phân biệt hoa thường/khoảng trắng
const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export default function EmployeeTable({
  data = [],
  departmentMap = {}, // Map { "IT": "Phòng CNTT", ... } truyền từ hook cha
  positionMap = {},   // Map { "DEV": "Lập trình viên", ... } truyền từ hook cha
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
  // Hàm resolve giúp lấy tên từ mã (VD: "IT" -> "Phòng CNTT")
  // Nếu không tìm thấy trong map, fallback về hiển thị mã gốc
  const resolve = (map, value) => map[normalizeCode(value)] || value || "";
  
  const hasActions = onView || onEdit || onDelete || renderExtraActions;
  // Tổng số cột: 10 cột dữ liệu + 1 cột thao tác (nếu có)
  const colCount = hasActions ? 11 : 10;

  return (
    <>
      <div className="table-responsive">
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
                  key={e.code || e.id} // Ưu tiên dùng code làm key
                  className={[
                    onRowClick ? "clickable" : "",
                    isSoftDeleted(e.deletedAt) ? "deleted" : ""
                  ].filter(Boolean).join(" ")}
                  onClick={() => onRowClick && onRowClick(e)}
                >
                  <td>{e.code}</td>
                  <td>{e.name}</td>
                  <td>{e.gender}</td>
                  <td>{formatDate(e.dob)}</td>
                  <td>{e.email}</td>
                  <td>{e.phone}</td>
                  
                  {/* Sử dụng hàm resolve để hiển thị tên phòng ban/vị trí */}
                  <td>{resolve(departmentMap, e.department)}</td>
                  <td>{resolve(positionMap, e.position)}</td>
                  
                  <td>{formatDate(e.joinDate)}</td>
                  
                  {/* Hiển thị trạng thái, có thể thêm class badge nếu cần */}
                  <td>
                    <span className={`status-badge ${e.status === 'Đang làm việc' ? 'active' : ''}`}>
                      {e.status}
                    </span>
                  </td>

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
      </div>

      <TablePagination 
        page={page} 
        totalPages={totalPages} 
        onPrev={onPrev} 
        onNext={onNext} 
      />
    </>
  );
}