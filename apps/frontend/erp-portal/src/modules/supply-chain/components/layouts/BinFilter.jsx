// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/BinFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function BinFilter({
  keyword = "",
  warehouseId = "", // Thay thế cho type (Lọc theo kho chứa)
  status = "",      // Lọc theo trạng thái (Active / Deleted)
  
  // Options
  warehouseOptions = [], // Danh sách kho hàng (đã map về dạng { value, label })

  statusOptions = [
     { value: "true", label: "Hoạt động" },
     { value: "false", label: "Ngừng hoạt động" }
  ],

  // Handlers
  onKeywordChange,
  onWarehouseChange, // Handler thay đổi kho
  onStatusChange,
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || warehouseId || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onWarehouseChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa */}
      {/* Với Bin, thường chỉ tìm theo Mã vị trí */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo mã vị trí..."
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Kho hàng (Warehouse) */}
      {/* Quan trọng: Giúp user xem danh sách vị trí của riêng 1 kho */}
      <FilterSelect
        value={warehouseId}
        onChange={onWarehouseChange}
        options={warehouseOptions}
        defaultLabel="Tất cả kho hàng"
      />

      {/* 3. Lọc theo Trạng thái (Active/Deleted) */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}