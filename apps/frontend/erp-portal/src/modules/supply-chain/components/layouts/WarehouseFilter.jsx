// apps/frontend/erp-portal/src/modules/inventory/components/layouts/WarehouseFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function WarehouseFilter({
  // values
  keyword = "",   // tìm theo mã/tên kho
  type = "",      // loại kho
  location = "",  // địa điểm
  manager = "",   // người phụ trách
  status = "",    // trạng thái

  // options: [{ value, label }]
  typeOptions = [],
  locationOptions = [],
  managerOptions = [],
  statusOptions = [],

  // handlers
  onKeywordChange,
  onTypeChange,
  onLocationChange,
  onManagerChange,
  onStatusChange,
  onClear,
}) {
  const canClear = keyword || type || location || manager || status;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onTypeChange?.("");
    onLocationChange?.("");
    onManagerChange?.("");
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
          placeholder="Tìm theo mã hoặc tên kho"
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

      {/* TYPE */}
      <select
        className="input"
        value={type}
        onChange={(e) => onTypeChange?.(e.target.value)}
      >
        <option value="">Tất cả loại kho</option>
        {safeArray(typeOptions).map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {/* LOCATION */}
      <select
        className="input"
        value={location}
        onChange={(e) => onLocationChange?.(e.target.value)}
      >
        <option value="">Tất cả địa điểm</option>
        {safeArray(locationOptions).map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>

      {/* MANAGER */}
      <select
        className="input"
        value={manager}
        onChange={(e) => onManagerChange?.(e.target.value)}
      >
        <option value="">Tất cả người phụ trách</option>
        {safeArray(managerOptions).map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
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
