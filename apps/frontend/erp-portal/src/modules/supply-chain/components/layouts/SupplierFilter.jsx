// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/SupplierFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function SupplierFilter({
  keyword = "",
  status = "",
  rating = "",
  statusOptions = [],
  ratingOptions = [],
  onKeywordChange,
  onStatusChange,
  onRatingChange,
  onClear,
}) {
  // Kiểm tra xem có đang filter gì không để hiện nút X trong ô search
  const hasFilter = keyword || status || rating;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onStatusChange?.("");
    onRatingChange?.("");
  };

  return (
    <FilterWrapper>
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo tên, mã hoặc MST"
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* Filter theo Trạng thái (Đang hợp tác / Dừng hợp tác) */}
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={statusOptions}
        defaultLabel="Tất cả trạng thái"
      />

      {/* Filter theo Đánh giá (VD: 5 sao, >= 4 sao...) */}
      <FilterSelect
        value={rating}
        onChange={onRatingChange}
        options={ratingOptions}
        defaultLabel="Tất cả đánh giá"
      />
    </FilterWrapper>
  );
}