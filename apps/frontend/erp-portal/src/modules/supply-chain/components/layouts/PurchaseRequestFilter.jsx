// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/PurchaseRequestFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function PurchaseRequestFilter({
  keyword = "",
  departmentId = "", // Thay thế parentId
  status = "",
  
  // Options
  departmentOptions = [], // Danh sách phòng ban (Map từ API departments)
  statusOptions = [],     // Option trạng thái (DRAFT, APPROVED,...)

  // Handlers
  onKeywordChange,
  onDepartmentChange, // Handler thay đổi phòng ban
  onStatusChange,
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || departmentId || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onDepartmentChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa (Mã PR, Lý do, Tên người request...) */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo mã phiếu, lý do..."
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Phòng ban */}
      <FilterSelect
        value={departmentId}
        onChange={onDepartmentChange}
        options={departmentOptions}
        defaultLabel="Tất cả phòng ban"
      />

      {/* 3. Lọc theo Trạng thái */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}