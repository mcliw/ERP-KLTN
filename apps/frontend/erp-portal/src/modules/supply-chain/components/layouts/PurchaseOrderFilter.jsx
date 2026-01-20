// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/PurchaseOrderFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

/**
 * Component bộ lọc cho danh sách Đơn mua hàng
 * * @param {string} keyword - Từ khóa tìm kiếm (Mã PO, Mã báo giá...)
 * @param {string} supplierId - ID nhà cung cấp đang chọn
 * @param {string} status - Trạng thái PO đang chọn
 * @param {Array} supplierOptions - Danh sách [{ value: 'id', label: 'Tên NCC' }]
 * @param {Array} statusOptions - Danh sách [{ value: 'APPROVED', label: 'Đã duyệt' }, ...]
 */
export default function PurchaseOrderFilter({
  keyword = "",
  supplierId = "",
  status = "",
  
  // Options
  supplierOptions = [], 
  statusOptions = [
    { value: "PENDING", label: "Chờ phê duyệt" },
    { value: "APPROVED", label: "Đã phê duyệt" },
    { value: "REJECTED", label: "Đã từ chối" },
    { value: "COMPLETED", label: "Đã hoàn thành" },
    { value: "CANCELLED", label: "Đã hủy bỏ" }
  ],

  // Handlers
  onKeywordChange,
  onSupplierChange,
  onStatusChange,
  onClear,
}) {
  // Kiểm tra xem có bất kỳ bộ lọc nào đang được áp dụng không
  const hasFilter = keyword || supplierId || status;

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onKeywordChange?.("");
      onSupplierChange?.("");
      onStatusChange?.("");
    }
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa (Mã PO, Mã Báo giá/RFQ) */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo mã PO, mã báo giá..."
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Nhà cung cấp */}
      <FilterSelect
        label="Nhà cung cấp"
        value={supplierId}
        onChange={onSupplierChange}
        options={supplierOptions}
        defaultLabel="Tất cả nhà cung cấp"
      />

      {/* 3. Lọc theo Trạng thái (PO-specific statuses) */}
      <FilterSelect
        label="Trạng thái"
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}