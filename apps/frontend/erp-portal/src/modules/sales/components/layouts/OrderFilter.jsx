// apps/frontend/erp-portal/src/modules/sales/components/layouts/OrderFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function OrderFilter({
  keyword = "",
  customerId = "",
  status = "",
  paymentMethod = "", // <-- [NEW] State hình thức thanh toán
  
  // Options
  customerOptions = [],
  statusOptions = [],
  paymentMethodOptions = [], // <-- [NEW] Danh sách options (COD, MOMO...)

  // Handlers
  onKeywordChange,
  onCustomerChange,
  onStatusChange,
  onPaymentMethodChange, // <-- [NEW] Handler
  onClear,
}) {
  // Cập nhật điều kiện hiển thị nút "Xóa bộ lọc"
  const hasFilter = keyword || customerId || status || paymentMethod;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onCustomerChange?.("");
    onStatusChange?.("");
    onPaymentMethodChange?.(""); // <-- [NEW] Reset
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm mã đơn, địa chỉ..."
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Khách hàng */}
      <FilterSelect
        value={customerId}
        onChange={onCustomerChange}
        options={customerOptions}
        defaultLabel="Tất cả khách hàng"
      />

      {/* 3. Hình thức thanh toán [NEW] */}
      <FilterSelect
        value={paymentMethod}
        onChange={onPaymentMethodChange}
        options={paymentMethodOptions}
        defaultLabel="Tất cả HTTT"
      />

      {/* 4. Trạng thái */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}