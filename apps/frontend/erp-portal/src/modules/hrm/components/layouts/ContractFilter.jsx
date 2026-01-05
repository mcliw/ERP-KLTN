// apps/frontend/erp-portal/src/modules/hrm/components/layouts/ContractFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function ContractFilter({
  // values
  keyword = "",
  contractType = "",
  status = "",

  // options [{ value, label }]
  contractTypeOptions = [],
  statusOptions = [],

  // handlers
  onKeywordChange,
  onContractTypeChange,
  onStatusChange,
  onClear,
}) {
  const canClear = keyword || contractType || status;

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onKeywordChange?.("");
    onContractTypeChange?.("");
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
          placeholder="Tìm theo mã hợp đồng / mã NV / tên nhân viên"
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

      {/* CONTRACT TYPE */}
      <select
        className="input"
        value={contractType}
        onChange={(e) =>
          onContractTypeChange?.(e.target.value)
        }
      >
        <option value="">Tất cả loại hợp đồng</option>
        {safeArray(contractTypeOptions).map((t) => (
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