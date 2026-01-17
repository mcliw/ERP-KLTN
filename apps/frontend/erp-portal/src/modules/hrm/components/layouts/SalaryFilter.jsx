// apps/frontend/erp-portal/src/modules/hrm/components/layouts/SalaryFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../common/FilterComponents";

export default function SalaryFilter({
  keyword = "",
  department = "",
  status = "",
  departmentOptions = [],
  statusOptions = [],
  onKeywordChange,
  onDepartmentChange,
  onStatusChange,
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang được áp dụng không
  const hasFilter = keyword || status || department;

  const handleClear = () => {
    if (onClear) return onClear();
    
    // Reset các giá trị về mặc định
    onKeywordChange?.("");
    onStatusChange?.("");
    onDepartmentChange?.("");
  };

  return (
    <FilterWrapper>
      {/* Search Input: Tìm theo tên nhân viên hoặc mã hợp đồng */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm nhân viên..."
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* Select: Lọc theo Phòng ban (Bổ sung thêm so với DepartmentFilter) */}
      <FilterSelect
        value={department}
        onChange={onDepartmentChange}
        options={departmentOptions}
        defaultLabel="Tất cả phòng ban"
      />

      {/* Select: Lọc theo Trạng thái (Hiệu lực, Hết hạn...) */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}