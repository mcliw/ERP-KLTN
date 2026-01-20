// apps/frontend/erp-portal/src/modules/sales/components/layouts/CustomerFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function CustomerFilter({
  keyword = "",
  status = "",
  
  // Options
  statusOptions = [], // Option trạng thái (ACTIVE/INACTIVE)

  // Handlers
  onKeywordChange,
  onStatusChange,
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không (bỏ parentId)
  const hasFilter = keyword || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa */}
      {/* Mở rộng phạm vi gợi ý tìm kiếm cho người dùng */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo tên, mã, SĐT hoặc email"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Trạng thái */}
      {/* Đã bỏ FilterSelect chọn Parent vì khách hàng không phân cấp */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}