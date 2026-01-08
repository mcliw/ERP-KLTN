// apps/frontend/erp-portal/src/modules/hrm/components/layouts/PositionFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function PositionFilter({
  // values
  keyword = "",
  department = "",
  status = "",

  // options: [{ value, label }]
  departmentOptions = [],
  statusOptions = [],

  // handlers
  onKeywordChange,
  onDepartmentChange,
  onStatusChange,
  onClear,
}) {
  const canClear = keyword || department || status;

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onKeywordChange?.("");
    onDepartmentChange?.("");
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
          placeholder="Tìm theo mã hoặc tên chức vụ"
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
