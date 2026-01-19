// apps/frontend/erp-portal/src/modules/hrm/components/layouts/OnLeaveFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function OnLeaveFilter({
  keyword = "",
  department = "",
  leaveType = "",
  status = "",
  departmentOptions = [],
  leaveTypeOptions = [],
  statusOptions = [],
  onKeywordChange,
  onDepartmentChange,
  onLeaveTypeChange,
  onStatusChange,
  onClear,
}) {
  const hasFilter = keyword || department || leaveType || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onDepartmentChange?.("");
    onLeaveTypeChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* Search */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo mã NV hoặc họ tên"
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

      {/* Leave Type Select */}
      <FilterSelect
        value={leaveType}
        onChange={onLeaveTypeChange}
        options={leaveTypeOptions}
        defaultLabel="Tất cả loại nghỉ"
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