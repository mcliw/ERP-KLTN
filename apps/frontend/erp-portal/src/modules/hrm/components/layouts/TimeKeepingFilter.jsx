// apps/frontend/erp-portal/src/modules/hrm/components/layouts/TimeKeepingFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function TimeKeepingFilter({
  keyword = "",
  departmentId = "", // Thêm: Lọc theo phòng ban
  status = "",
  date = "", // Thêm: Lọc theo ngày (quan trọng với chấm công)
  departmentOptions = [],
  statusOptions = [],
  onKeywordChange,
  onDepartmentChange,
  onStatusChange,
  onDateChange,
  onClear,
}) {
  // Kiểm tra xem có đang filter bất kỳ trường nào không
  const hasFilter = keyword || status || departmentId || date;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onStatusChange?.("");
    onDepartmentChange?.("");
    onDateChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Search: Tìm theo tên/mã nhân viên */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm tên hoặc mã nhân viên"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Date: Chọn ngày xem công */}
      {/* Nếu bạn chưa có component FilterDate, dùng tạm input native HTML */}
      <div className="filter-item">
        <input 
            type="date" 
            className="form-control"
            value={date}
            onChange={(e) => onDateChange?.(e.target.value)}
            style={{ height: '36px', border: '1px solid #d9d9d9', borderRadius: '4px', padding: '0 8px' }}
        />
      </div>

      {/* 3. Select: Lọc theo Phòng ban */}
      <FilterSelect
        value={departmentId}
        onChange={onDepartmentChange}
        options={departmentOptions}
        defaultLabel="Tất cả phòng ban"
      />

      {/* 4. Select: Trạng thái chấm công (Đi muộn, Về sớm,...) */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}