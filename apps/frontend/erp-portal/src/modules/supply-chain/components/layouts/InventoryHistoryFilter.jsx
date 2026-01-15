// apps/frontend/erp-portal/src/modules/inventory/components/layouts/InventoryHistoryFilter.jsx

import { FaSearch, FaTimes } from "react-icons/fa";
import "../styles/filter.css";

const safeArray = (v) => (Array.isArray(v) ? v : []);

export default function InventoryHistoryFilter({
  // values
  keyword = "",          // tìm theo mã chứng từ / ghi chú / serial-tag...
  transactionType = "",  // IN/OUT/TRANSFER/ADJUST/...
  documentType = "",     // GRN/GDN/TRF/...
  user = "",             // mã user/nhân viên
  fromDate = "",         // YYYY-MM-DD
  toDate = "",           // YYYY-MM-DD

  // options: [{ value, label }]
  transactionTypeOptions = [],
  documentTypeOptions = [],
  userOptions = [],

  // handlers
  onKeywordChange,
  onTransactionTypeChange,
  onDocumentTypeChange,
  onUserChange,
  onFromDateChange,
  onToDateChange,
  onClear,
}) {
  const canClear =
    keyword || transactionType || documentType || user || fromDate || toDate;

  const handleClear = () => {
    if (onClear) return onClear();
    onKeywordChange?.("");
    onTransactionTypeChange?.("");
    onDocumentTypeChange?.("");
    onUserChange?.("");
    onFromDateChange?.("");
    onToDateChange?.("");
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
          placeholder="Tìm theo chứng từ/serial/tag/ghi chú"
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

      {/* DATE FROM */}
      <input
        className="input"
        type="date"
        value={fromDate}
        onChange={(e) => onFromDateChange?.(e.target.value)}
        title="Từ ngày"
      />

      {/* DATE TO */}
      <input
        className="input"
        type="date"
        value={toDate}
        onChange={(e) => onToDateChange?.(e.target.value)}
        title="Đến ngày"
      />

      {/* TRANSACTION TYPE */}
      <select
        className="input"
        value={transactionType}
        onChange={(e) => onTransactionTypeChange?.(e.target.value)}
      >
        <option value="">Tất cả loại giao dịch</option>
        {safeArray(transactionTypeOptions).map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {/* DOCUMENT TYPE */}
      <select
        className="input"
        value={documentType}
        onChange={(e) => onDocumentTypeChange?.(e.target.value)}
      >
        <option value="">Tất cả loại chứng từ</option>
        {safeArray(documentTypeOptions).map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      {/* USER */}
      <select
        className="input"
        value={user}
        onChange={(e) => onUserChange?.(e.target.value)}
      >
        <option value="">Tất cả người thao tác</option>
        {safeArray(userOptions).map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
    </div>
  );
}
