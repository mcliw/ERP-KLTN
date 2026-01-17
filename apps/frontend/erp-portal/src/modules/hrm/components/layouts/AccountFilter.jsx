// apps/frontend/erp-portal/src/modules/hrm/components/layouts/AccountFiler.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../common/FilterComponents";

export default function AccountFilter({
  keyword = "",
  role = "",
  status = "",
  roleOptions = [],
  statusOptions = [],
  onKeywordChange,
  onRoleChange,
  onStatusChange,
  onClear,
}) {
  // Logic kiểm tra có đang filter không
  const hasFilter = keyword || role || status;

  // Logic clear
  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onRoleChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo tài khoản, họ tên hoặc email"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      <FilterSelect
        value={role}
        onChange={onRoleChange}
        options={roleOptions}
        defaultLabel="Tất cả vai trò"
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