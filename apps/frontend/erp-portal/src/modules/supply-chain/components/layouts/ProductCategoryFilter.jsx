// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/ProductCategoryFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function ProductCategoryFilter({
  keyword = "",
  parentId = "",
  status = "",
  
  // Options
  parentOptions = [], // Danh sách các danh mục có thể làm cha
  statusOptions = [], // Option trạng thái (Hoạt động/Ngừng hoạt động)

  // Handlers
  onKeywordChange,
  onParentChange,
  onStatusChange,
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || parentId || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onParentChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo tên hoặc mã danh mục"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Danh mục cha */}
      <FilterSelect
        value={parentId}
        onChange={onParentChange}
        options={parentOptions}
        defaultLabel="Tất cả danh mục cha"
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