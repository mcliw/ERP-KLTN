// apps/frontend/erp-portal/src/modules/inventory/components/layouts/InventoryFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function InventoryFilter({
  // values
  keyword = "",
  itemType = "",   // PRODUCT | ASSET
  warehouse = "",
  category = "",
  status = "",
  condition = "",

  // options: [{ value, label }]
  itemTypeOptions = [],
  warehouseOptions = [],
  categoryOptions = [],
  statusOptions = [],
  conditionOptions = [],

  // handlers
  onKeywordChange,
  onItemTypeChange,
  onWarehouseChange,
  onCategoryChange,
  onStatusChange,
  onConditionChange,
  onClear,
}) {
  const canClear =
    keyword || itemType || warehouse || category || status || condition;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onItemTypeChange?.("");
    onWarehouseChange?.("");
    onCategoryChange?.("");
    onStatusChange?.("");
    onConditionChange?.("");
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
          placeholder="Tìm theo mã/tên/serial/tag"
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

      {/* ITEM TYPE */}
      <select
        className="input"
        value={itemType}
        onChange={(e) => onItemTypeChange?.(e.target.value)}
      >
        <option value="">Tất cả loại</option>
        {safeArray(itemTypeOptions).map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {/* WAREHOUSE */}
      <select
        className="input"
        value={warehouse}
        onChange={(e) => onWarehouseChange?.(e.target.value)}
      >
        <option value="">Tất cả kho</option>
        {safeArray(warehouseOptions).map((w) => (
          <option key={w.value} value={w.value}>
            {w.label}
          </option>
        ))}
      </select>

      {/* CATEGORY */}
      <select
        className="input"
        value={category}
        onChange={(e) => onCategoryChange?.(e.target.value)}
      >
        <option value="">Tất cả danh mục</option>
        {safeArray(categoryOptions).map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {/* CONDITION (thường áp dụng cho tài sản) */}
      <select
        className="input"
        value={condition}
        onChange={(e) => onConditionChange?.(e.target.value)}
      >
        <option value="">Tất cả tình trạng</option>
        {safeArray(conditionOptions).map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
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
