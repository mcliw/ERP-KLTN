// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/WarehouseFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function WarehouseFilter({
  keyword = "",
  type = "",   // Thay thế cho parentId của Category
  status = "", // Tương ứng với is_active (true/false)
  
  // Options
  typeOptions = [],   // Danh sách loại kho (CENTRAL, LOCAL,...)
  statusOptions = [], // Option trạng thái (Hoạt động/Ngừng hoạt động)

  // Handlers
  onKeywordChange,
  onTypeChange,   // Handler cho thay đổi loại kho
  onStatusChange,
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || type || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onTypeChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa */}
      {/* Tìm theo Code, Name hoặc Address */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo tên, mã kho hoặc địa chỉ"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Loại kho (Warehouse Type) */}
      <FilterSelect
        value={type}
        onChange={onTypeChange}
        options={typeOptions}
        defaultLabel="Tất cả loại kho"
      />

      {/* 3. Lọc theo Trạng thái (Active/Inactive) */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}