// apps/frontend/erp-portal/src/modules/hrm/components/layouts/DepartmentFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../common/FilterComponents";

export default function DepartmentFilter({
  keyword = "",
  status = "",
  statusOptions = [],
  onKeywordChange,
  onStatusChange,
  onClear,
}) {
  const hasFilter = keyword || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* Search */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo mã hoặc tên phòng ban"
        hasFilter={hasFilter}
        onClear={handleClear}
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