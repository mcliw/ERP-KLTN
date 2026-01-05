// apps/frontend/erp-portal/src/modules/hrm/components/layouts/AccountFilter.jsx

import { FaSearch } from "react-icons/fa";
import "../styles/filter.css";

export default function AccountFilter({
  keyword,
  status,
  role,

  statusOptions = [],
  roleOptions = [],

  onKeywordChange,
  onStatusChange,
  onRoleChange,
}) {
  return (
    <div className="filters">
      {/* SEARCH */}
      <div className="search-wrap">
        <FaSearch className="search-icon" />
        <input
          className="search-input"
          placeholder="Tìm theo tài khoản, họ tên hoặc email"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </div>

      {/* ROLE */}
      <select
        className="input"
        value={role}
        onChange={(e) => onRoleChange?.(e.target.value)}
      >
        <option value="">Tất cả vai trò</option>
        {roleOptions.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {/* STATUS */}
      <select
        className="input"
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <option value="">Tất cả trạng thái</option>
        {statusOptions.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
