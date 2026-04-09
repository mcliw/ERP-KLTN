// apps/frontend/erp-portal/src/modules/hrm/components/common/FilterComponents.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export const FilterWrapper = ({ children }) => {
  return <div className="filters">{children}</div>;
};

export const FilterSearch = ({
  keyword,
  onKeywordChange,
  placeholder = "Tìm kiếm...",
  hasFilter = false,
  onClear,
}) => {
  return (
    <div className="search-wrap">
      <FaSearch className="search-icon" />
      <input
        className="search-input"
        name="keyword"
        value={keyword}
        placeholder={placeholder}
        onChange={(e) => onKeywordChange?.(e.target.value)}
      />

      {hasFilter && onClear && (
        <button
          type="button"
          className="clear-btn"
          onClick={onClear}
          title="Xoá bộ lọc"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export const FilterSelect = ({
  value,
  onChange,
  options = [],
  defaultLabel = "Tất cả",
  className = "input",
}) => {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">{defaultLabel}</option>
      {safeArray(options).map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};