// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/ProductFilter.jsx

import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function ProductFilter({
  keyword = "",
  categoryId = "",
  productType = "",
  categoryOptions = [], // [{ value: 1, label: 'Điện tử' }, ...]
  typeOptions = [],     // [{ value: 'finished', label: 'Thành phẩm' }, ...]
  onKeywordChange,
  onCategoryChange,
  onTypeChange,
  onClear,
}) {
  // Kiểm tra xem có đang áp dụng bộ lọc nào không
  const hasFilter = keyword || categoryId || productType;

  const handleClear = () => {
    if (onClear) return onClear();
    
    // Reset từng state nếu không có hàm onClear chung
    onKeywordChange?.("");
    onCategoryChange?.("");
    onTypeChange?.("");
  };

  return (
    <FilterWrapper>
      {/* Search Block */}
      <FilterSearch
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        placeholder="Tìm theo SKU, tên sản phẩm hoặc thương hiệu..."
        hasFilter={hasFilter}
        onClear={handleClear}
      />

      {/* Filter: Category (Danh mục) - Tương ứng category_id */}
      <FilterSelect
        value={categoryId}
        onChange={onCategoryChange}
        options={categoryOptions}
        defaultLabel="Tất cả danh mục"
      />

      {/* Filter: Product Type (Loại sản phẩm) - Tương ứng product_type */}
      <FilterSelect
        value={productType}
        onChange={onTypeChange}
        options={typeOptions}
        defaultLabel="Tất cả loại SP"
      />
    </FilterWrapper>
  );
}