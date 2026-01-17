// apps/frontend/erp-portal/src/modules/inventory/components/layouts/ProductFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function ProductFilter({
  // values
  keyword = "",
  category = "",
  brand = "",
  status = "",

  // options: [{ value, label }]
  categoryOptions = [],
  brandOptions = [],
  statusOptions = [],

  // handlers
  onKeywordChange,
  onCategoryChange,
  onBrandChange,
  onStatusChange,
  onClear,
}) {
  const canClear = keyword || category || brand || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onCategoryChange?.("");
    onBrandChange?.("");
    onStatusChange?.("");
  };

  return (
    <div className="filters">
      {/* SEARCH */}
      <div className="search-wrap">
        <FaSearch className="search-icon" />
        <input
          className="search-input"
          name="keyword"
          value={keyword}
          placeholder="Tìm theo tên, mã hoặc model"
          onChange={(e) => onKeywordChange?.(e.target.value)}
        />

        {canClear && (
          <button
            type="button"
            className="clear-btn"
            onClick={handleClear}
            title="Xoá bộ lọc"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* CATEGORY */}
      <select
        className="input"
        value={category}
        onChange={(e) => onCategoryChange?.(e.target.value)}
      >
        <option value="">Tất cả loại sản phẩm</option>
        {safeArray(categoryOptions).map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {/* BRAND */}
      <select
        className="input"
        value={brand}
        onChange={(e) => onBrandChange?.(e.target.value)}
      >
        <option value="">Tất cả hãng</option>
        {safeArray(brandOptions).map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>

      {/* STATUS */}
      <select
        className="input"
        value={status}
        onChange={(e) => onStatusChange?.(e.target.value)}
      >
        <option value="">Tất cả trạng thái</option>
        {safeArray(statusOptions).map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
