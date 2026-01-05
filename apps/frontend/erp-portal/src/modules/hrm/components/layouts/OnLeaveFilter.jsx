// apps/frontend/erp-portal/src/modules/hrm/components/layouts/OnLeaveFilter.jsx

import { FaSearch } from "react-icons/fa";
import "../styles/filter.css";

export default function OnLeaveFilter({
  keyword,
  department,
  leaveType,
  status,

  departmentOptions = [],
  leaveTypeOptions = [],
  statusOptions = [],

  onKeywordChange,
  onDepartmentChange,
  onLeaveTypeChange,
  onStatusChange,
}) {
  return (
    <div className="filters">
      {/* SEARCH */}
      <div className="search-wrap">
        <FaSearch className="search-icon" />
        <input
          className="search-input"
          placeholder="Tìm theo mã NV hoặc tên"
          value={keyword}
          onChange={(e) => onKeywordChange?.(e.target.value)}
        />
      </div>

      {/* DEPARTMENT */}
      <select
        className="input"
        value={department}
        onChange={(e) => onDepartmentChange?.(e.target.value)}
      >
        <option value="">Tất cả phòng ban</option>
        {departmentOptions.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      {/* LEAVE TYPE */}
      <select
        className="input"
        value={leaveType}
        onChange={(e) => onLeaveTypeChange?.(e.target.value)}
      >
        <option value="">Tất cả loại nghỉ</option>
        {leaveTypeOptions.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
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
        {statusOptions.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
