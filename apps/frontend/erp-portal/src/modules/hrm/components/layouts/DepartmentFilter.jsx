// apps/frontend/erp-portal/src/modules/hrm/components/layouts/DepartmentFilter.jsx

import { FaSearch } from "react-icons/fa";
import "../styles/filter.css";

export default function DepartmentFilter({
  keyword,
  status,

  statusOptions = [],

  onKeywordChange,
  onStatusChange,
}) {
  return (
    <div className="filters">
      {/* SEARCH */}
      <div className="search-wrap">
        <FaSearch className="search-icon" />
        <input
          className="search-input"
          placeholder="Tìm theo mã hoặc tên phòng ban"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </div>

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