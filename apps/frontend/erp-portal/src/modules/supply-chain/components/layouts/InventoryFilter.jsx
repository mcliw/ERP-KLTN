// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/InventoryFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function InventoryFilter({
  keyword = "",
  warehouseId = "",   // Thay thế cho type (Lọc theo kho cụ thể)
  stockStatus = "",   // Thay thế cho status (Lọc theo trạng thái tồn: Còn hàng/Hết hàng)
  
  // Options
  warehouseOptions = [], // Danh sách kho lấy từ API warehouses ({ value: id, label: name })
  stockStatusOptions = [ // Các option hardcode cho nghiệp vụ tồn kho
    { value: "AVAILABLE", label: "Có hàng sẵn (Available > 0)" },
    { value: "OUT_OF_STOCK", label: "Hết hàng (Available = 0)" },
    { value: "ALLOCATED", label: "Đang giữ hàng (Allocated > 0)" },
    { value: "LOW_STOCK", label: "Cảnh báo tồn thấp (< 10)" },
  ],

  // Handlers
  onKeywordChange,
  onWarehouseChange,  // Handler cho thay đổi kho
  onStockStatusChange,
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || warehouseId || stockStatus;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onWarehouseChange?.("");
    onStockStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa */}
      {/* Trong Inventory thường tìm theo Tên sản phẩm hoặc Mã SKU */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm tên sản phẩm hoặc mã SKU"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Kho hàng (Warehouse) */}
      {/* Quan trọng: Người dùng cần biết hàng này đang ở kho nào */}
      <FilterSelect
        value={warehouseId}
        onChange={onWarehouseChange}
        options={warehouseOptions}
        defaultLabel="Tất cả kho hàng"
      />

      {/* 3. Lọc theo Trạng thái tồn kho */}
      {/* Giúp nhanh chóng tìm các mặt hàng cần xử lý (nhập thêm hoặc giải phóng) */}
      <FilterSelect
        value={stockStatus}
        onChange={onStockStatusChange}
        options={stockStatusOptions}
        defaultLabel="Tất cả trạng thái tồn"
      />
    </FilterWrapper>
  );
}