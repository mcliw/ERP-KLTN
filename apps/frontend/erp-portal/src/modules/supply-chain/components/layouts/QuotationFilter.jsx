// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/QuotationFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function QuotationFilter({
  keyword = "",
  supplierId = "", // Thay thế departmentId (Lọc theo NCC)
  status = "",
  
  // Options
  supplierOptions = [], // Danh sách Nhà cung cấp (Map từ API suppliers)
  statusOptions = [],   // Option trạng thái (PENDING, APPROVED, REJECTED)

  // Handlers
  onKeywordChange,
  onSupplierChange, // Handler thay đổi NCC
  onStatusChange,
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || supplierId || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onSupplierChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa (Mã RFQ, Mã PR...) */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo mã RFQ, mã PR..."
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Nhà cung cấp */}
      <FilterSelect
        value={supplierId}
        onChange={onSupplierChange}
        options={supplierOptions}
        defaultLabel="Tất cả nhà cung cấp"
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