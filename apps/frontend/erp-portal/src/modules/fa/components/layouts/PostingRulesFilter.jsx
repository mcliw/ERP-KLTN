// apps/frontend/erp-portal/src/modules/finance/components/layouts/PostingRulesFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

// Mặc định danh sách phân hệ
const DEFAULT_MODULE_OPTIONS = [
  { value: "SUPPLYCHAIN", label: "Chuỗi cung ứng" },
  { value: "SALES", label: "Bán hàng" },
  { value: "HRM", label: "Nhân sự" },
  { value: "GENERAL", label: "Tổng hợp" },
];

// [MỚI] Mặc định danh sách trạng thái
const DEFAULT_STATUS_OPTIONS = [
  { value: "true", label: "Hoạt động" },
  { value: "false", label: "Ngừng hoạt động" }
];

export default function PostingRulesFilter({
  keyword = "",
  moduleSource = "",
  accountId = "", // Lọc các rule dính đến tài khoản này
  status = "",    // [MỚI] Lọc theo trạng thái
  
  // Options
  moduleOptions = DEFAULT_MODULE_OPTIONS,
  accountOptions = [], // Format: [{ value: id, label: "Code - Name" }]
  statusOptions = DEFAULT_STATUS_OPTIONS, // [MỚI]

  // Handlers
  onKeywordChange,
  onModuleChange,
  onAccountChange,
  onStatusChange, // [MỚI]
  onClear,
}) {
  // Kiểm tra xem có bộ lọc nào đang active không
  const hasFilter = keyword || moduleSource || accountId || status;

  const handleClear = () => {
    if (onClear) return onClear();
    // Reset từng field
    onKeywordChange?.("");
    onModuleChange?.("");
    onAccountChange?.("");
    onStatusChange?.("");
  };

  return (
    <FilterWrapper>
      {/* 1. Tìm kiếm từ khóa */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm mã sự kiện hoặc diễn giải"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* 2. Lọc theo Phân hệ nguồn */}
      <FilterSelect
        value={moduleSource}
        onChange={onModuleChange}
        options={moduleOptions}
        defaultLabel="Tất cả phân hệ"
      />

      {/* 3. Lọc theo Tài khoản liên quan */}
      <FilterSelect
        value={accountId}
        onChange={onAccountChange}
        options={accountOptions}
        defaultLabel="Tất cả tài khoản"
      />

      {/* [MỚI] 4. Lọc theo Trạng thái */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />
    </FilterWrapper>
  );
}