// apps/frontend/erp-portal/src/modules/sales/components/layouts/ReceiptFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function ReceiptFilter({
  keyword = "",
  debitAccount = "", // Thay thế status bằng debitAccount để lọc theo loại tiền (111/112)
  
  // Options
  accountOptions = [], // Danh sách option: [{ value: '111', label: '111 - Tiền mặt' }, ...]

  // Handlers
  onKeywordChange,
  onAccountChange, // Thay thế onStatusChange
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || debitAccount;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onAccountChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa */}
      {/* Mở rộng phạm vi tìm kiếm: Số phiếu, Tên KH, Mã đơn hàng */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm số phiếu, khách hàng hoặc mã đơn..."
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Tài khoản Nợ (Loại tiền) */}
      <FilterSelect
        value={debitAccount}
        onChange={onAccountChange}
        options={accountOptions}
        defaultLabel="Tất cả tài khoản nợ"
      />
    </FilterWrapper>
  );
}