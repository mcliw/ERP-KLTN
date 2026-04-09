import { FilterWrapper, FilterSearch, FilterSelect } from "../../../../shared/components/FilterComponents";

export default function ProductFilter({
  keyword, categoryId, type, status,
  categoryOptions = [],
  onKeywordChange, onCategoryChange, onTypeChange, onStatusChange, onClear
}) {
  const hasFilter = keyword || categoryId || type || status;

  return (
    <FilterWrapper>
      <FilterSearch keyword={keyword} onKeywordChange={onKeywordChange} placeholder="Tìm SKU, tên sản phẩm..." hasFilter={hasFilter} onClear={onClear} />
      
      <FilterSelect value={categoryId} onChange={onCategoryChange} options={categoryOptions} defaultLabel="Tất cả danh mục" />
      
      <FilterSelect value={type} onChange={onTypeChange} defaultLabel="Tất cả phân loại" 
        options={[{value: "Hàng hóa kinh doanh", label: "Hàng hóa"}, {value: "Tài sản công ty", label: "Tài sản"}]} 
      />
      
      <FilterSelect value={status} onChange={onStatusChange} defaultLabel="Tất cả trạng thái" 
        options={[{value: "Hoạt động", label: "Hoạt động"}, {value: "Ngừng hoạt động", label: "Ngừng hoạt động"}]} 
      />
    </FilterWrapper>
  );
}