// apps/frontend/erp-portal/src/modules/hrm/components/layouts/PositionFilter.jsx

import { FaSearch } from "react-icons/fa";
import "../styles/filter.css";

export default function PositionFilter({
  keyword,
  department,
  status,

  departmentOptions = [],
  statusOptions = [],

  onKeywordChange,
  onDepartmentChange,
  onStatusChange,
}) {
  return (
    <div className="filters">
      <div className="search-wrap">
        <FaSearch className="search-icon" />
        <input
          className="search-input"
          placeholder="Tìm theo mã hoặc tên chức vụ"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </div>

      <select className="input" value={department} onChange={(e) => onDepartmentChange(e.target.value)}>
        <option value="">Tất cả phòng ban</option>
        {departmentOptions.map((d) => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>

      <select className="input" value={status} onChange={(e) => onStatusChange(e.target.value)}>
        <option value="">Tất cả trạng thái</option>
        {statusOptions.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
