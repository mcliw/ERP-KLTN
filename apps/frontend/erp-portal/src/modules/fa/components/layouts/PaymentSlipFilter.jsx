// apps/frontend/erp-portal/src/modules/finance/components/layouts/PaymentSlipFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function PaymentSlipFilter({
  keyword = "",
  creditAccount = "", // Lọc theo Tài khoản Có (Loại tiền chi ra)
  
  // Options
  accountOptions = [], // Danh sách option: [{ value: '111', label: '111 - Tiền mặt' }, ...]

  // Handlers
  onKeywordChange,
  onAccountChange,
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || creditAccount;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onAccountChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm số phiếu, nhà cung cấp hoặc mã PO..."
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Tài khoản Có (Hình thức thanh toán) */}
      <FilterSelect
        value={creditAccount}
        onChange={onAccountChange}
        options={accountOptions}
        defaultLabel="Tất cả tài khoản"
      />
    </FilterWrapper>
  );
}