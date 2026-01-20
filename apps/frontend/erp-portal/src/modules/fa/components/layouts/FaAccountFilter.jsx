// apps/frontend/erp-portal/src/modules/finance/components/layouts/FaAccountFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function FaAccountFilter({
  keyword = "",
  accountType = "",       // [Mới] Lọc theo loại tài khoản (ASSET, LIABILITY...)
  parentAccountId = "",   // Lọc theo tài khoản cha
  status = "",            // Lọc theo trạng thái (true/false)
  
  // Options
  typeOptions = [],       // Option loại tài khoản
  parentOptions = [],     // Option tài khoản cha (dạng Tree hoặc List phẳng)
  statusOptions = [       // Default options cho trạng thái is_active
    { value: "true", label: "Hoạt động" },
    { value: "false", label: "Ngừng hoạt động" }
  ],

  // Handlers
  onKeywordChange,
  onTypeChange,
  onParentChange,
  onStatusChange,
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || accountType || parentAccountId || status;

  const handleClear = () => {
    if (onClear) return onClear();
    // Reset từng field nếu không có hàm clear chung
    onKeywordChange?.("");
    onTypeChange?.("");
    onParentChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa (Số hiệu hoặc Tên TK) */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm số hiệu hoặc tên tài khoản"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. [Mới] Lọc theo Loại tài khoản */}
      <FilterSelect
        value={accountType}
        onChange={onTypeChange}
        options={typeOptions}
        defaultLabel="Tất cả loại TK"
      />

      {/* 3. Lọc theo Tài khoản cha */}
      <FilterSelect
        value={parentAccountId}
        onChange={onParentChange}
        options={parentOptions}
        defaultLabel="Tất cả TK cha"
      />

      {/* 4. Lọc theo Trạng thái */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}