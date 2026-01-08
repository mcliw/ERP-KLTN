// apps/frontend/erp-portal/src/modules/hrm/components/layouts/EmployeeFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function EmployeeFilter({
  // values
  keyword = "",
  department = "",
  position = "",
  gender = "",
  status = "",

  // options: [{ value, label }]
  departmentOptions = [],
  positionOptions = [],
  genderOptions = [],
  statusOptions = [],

  // handlers
  onKeywordChange,
  onDepartmentChange,
  onPositionChange,
  onGenderChange,
  onStatusChange,
  onClear,
}) {
  const canClear =
    keyword || department || position || gender || status;

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onKeywordChange?.("");
    onDepartmentChange?.("");
    onPositionChange?.("");
    onGenderChange?.("");
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
          placeholder="Tìm theo tên hoặc email"
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

      {/* POSITION */}
      <select
        className="input"
        value={position}
        onChange={(e) =>
          onPositionChange?.(e.target.value)
        }
      >
        <option value="">Tất cả chức vụ</option>
        {safeArray(positionOptions).map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      {/* GENDER */}
      <select
        className="input"
        value={gender}
        onChange={(e) =>
          onGenderChange?.(e.target.value)
        }
      >
        <option value="">Tất cả giới tính</option>
        {safeArray(genderOptions).map((g) => (
          <option key={g.value} value={g.value}>
            {g.label}
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