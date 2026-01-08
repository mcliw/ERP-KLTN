// apps/frontend/erp-portal/src/modules/hrm/components/layouts/AccountFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function AccountFilter({
  // values
  keyword = "",
  role = "",
  status = "",

  // options
  roleOptions = [],
  statusOptions = [],

  // handlers
  onKeywordChange,
  onRoleChange,
  onStatusChange,
  onClear,
}) {
  const canClear = keyword || role || status;

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onKeywordChange?.("");
    onRoleChange?.("");
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
          placeholder="Tìm theo tài khoản, họ tên hoặc email"
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

      {/* ROLE */}
      <select
        className="input"
        value={role}
        onChange={(e) =>
          onRoleChange?.(e.target.value)
        }
      >
        <option value="">Tất cả vai trò</option>
        {safeArray(roleOptions).map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

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