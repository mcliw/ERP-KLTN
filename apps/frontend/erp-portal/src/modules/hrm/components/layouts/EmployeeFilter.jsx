// apps/frontend/erp-portal/src/modules/hrm/components/layouts/EmployeeFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function EmployeeFilter({
  keyword = "",
  department = "",
  position = "",
  gender = "",
  status = "",
  departmentOptions = [],
  positionOptions = [],
  genderOptions = [],
  statusOptions = [],
  onKeywordChange,
  onDepartmentChange,
  onPositionChange,
  onGenderChange,
  onStatusChange,
  onClear,
}) {
  const hasFilter = keyword || department || position || gender || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onDepartmentChange?.("");
    onPositionChange?.("");
    onGenderChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo tên hoặc email"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      <FilterSelect
        value={department}
        onChange={onDepartmentChange}
        options={departmentOptions}
        defaultLabel="Tất cả phòng ban"
      />

      <FilterSelect
        value={position}
        onChange={onPositionChange}
        options={positionOptions}
        defaultLabel="Tất cả chức vụ"
      />

      <FilterSelect
        value={gender}
        onChange={onGenderChange}
        options={genderOptions}
        defaultLabel="Tất cả giới tính"
      />

      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}