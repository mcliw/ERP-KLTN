// apps/frontend/erp-portal/src/modules/hrm/components/layouts/PositionFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../common/FilterComponents";

export default function PositionFilter({
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
  const hasFilter = keyword || department || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onDepartmentChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* Search */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo mã hoặc tên chức vụ"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* Department Select */}
      <FilterSelect
        value={department}
        onChange={onDepartmentChange}
        options={departmentOptions}
        defaultLabel="Tất cả phòng ban"
      />

      {/* Status Select */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}