// apps/frontend/erp-portal/src/modules/asset/components/layouts/AssetFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function AssetFilter({
  // values
  keyword = "",
  category = "",
  type = "",
  department = "",
  status = "",
  condition = "",

  // options: [{ value, label }]
  categoryOptions = [],
  typeOptions = [],
  departmentOptions = [],
  statusOptions = [],
  conditionOptions = [],

  // handlers
  onKeywordChange,
  onCategoryChange,
  onTypeChange,
  onDepartmentChange,
  onStatusChange,
  onConditionChange,
  onClear,
}) {
  const canClear =
    keyword || category || type || department || status || condition;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onCategoryChange?.("");
    onTypeChange?.("");
    onDepartmentChange?.("");
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
          placeholder="Tìm theo tên, mã, serial/tag"
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
        <option value="">Tất cả nhóm tài sản</option>
        {safeArray(categoryOptions).map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {/* TYPE */}
      <select
        className="input"
        value={type}
        onChange={(e) => onTypeChange?.(e.target.value)}
      >
        <option value="">Tất cả loại tài sản</option>
        {safeArray(typeOptions).map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {/* DEPARTMENT */}
      <select
        className="input"
        value={department}
        onChange={(e) => onDepartmentChange?.(e.target.value)}
      >
        <option value="">Tất cả phòng ban</option>
        {safeArray(departmentOptions).map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      {/* CONDITION */}
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
