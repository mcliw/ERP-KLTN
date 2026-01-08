// apps/frontend/erp-portal/src/modules/hrm/components/layouts/DepartmentFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function DepartmentFilter({
  // values
  keyword = "",
  status = "",

  // options: [{ value, label }]
  statusOptions = [],

  // handlers
  onKeywordChange,
  onStatusChange,
  onClear,
}) {
  const canClear = keyword || status;

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onKeywordChange?.("");
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
          placeholder="Tìm theo mã hoặc tên phòng ban"
          onChange={(e) =>
            onKeywordChange?.(e.target.value)
          }
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

      {/* STATUS */}
      <select
        className="input"
        value={status}
        onChange={(e) =>
          onStatusChange?.(e.target.value)
        }
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
