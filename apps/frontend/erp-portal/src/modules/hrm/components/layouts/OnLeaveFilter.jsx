// apps/frontend/erp-portal/src/modules/hrm/components/layouts/OnLeaveFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function OnLeaveFilter({
  // values
  keyword = "",
  department = "",
  leaveType = "",
  status = "",

  // options
  departmentOptions = [],
  leaveTypeOptions = [],
  statusOptions = [],

  // handlers
  onKeywordChange,
  onDepartmentChange,
  onLeaveTypeChange,
  onStatusChange,
  onClear,
}) {
  const canClear =
    keyword || department || leaveType || status;

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onKeywordChange?.("");
    onDepartmentChange?.("");
    onLeaveTypeChange?.("");
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
          placeholder="Tìm theo mã NV hoặc họ tên"
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

      {/* DEPARTMENT */}
      <select
        className="input"
        value={department}
        onChange={(e) =>
          onDepartmentChange?.(e.target.value)
        }
      >
        <option value="">Tất cả phòng ban</option>
        {safeArray(departmentOptions).map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      {/* LEAVE TYPE */}
      <select
        className="input"
        value={leaveType}
        onChange={(e) =>
          onLeaveTypeChange?.(e.target.value)
        }
      >
        <option value="">Tất cả loại nghỉ</option>
        {safeArray(leaveTypeOptions).map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
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