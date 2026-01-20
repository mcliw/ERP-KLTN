// apps/frontend/erp-portal/src/modules/sales/components/layouts/VoucherFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function VoucherFilter({
  keyword = "",
  status = "",
  discountType = "", // Thêm bộ lọc loại voucher

  // Options
  statusOptions = [], // Option trạng thái (ACTIVE/INACTIVE)
  discountTypeOptions = [], // Option loại: [%] hoặc [Số tiền cố định]

  // Handlers
  onKeywordChange,
  onStatusChange,
  onDiscountTypeChange, // Handler cho loại voucher
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || status || discountType;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onStatusChange?.("");
    onDiscountTypeChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo mã voucher (Code)..."
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Loại giảm giá (Mới) */}
      {/* Giúp user lọc nhanh các mã giảm % hoặc giảm tiền mặt */}
      <FilterSelect
        value={discountType}
        onChange={onDiscountTypeChange}
        options={discountTypeOptions}
        defaultLabel="Tất cả loại voucher"
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