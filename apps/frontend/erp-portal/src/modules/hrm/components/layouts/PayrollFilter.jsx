// components/layouts/PayrollFilter.jsx

import "../styles/filter.css";

export default function PayrollFilter({
  period,
  status,
  onPeriodChange,
  onStatusChange,
  onReset,
}) {
  return (
    <div className="filters">
      <input
        type="month"
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
      />

      <select value={status} onChange={(e) => onStatusChange(e.target.value)}>
        <option value="">-- Trạng thái --</option>
        <option value="Nháp">Nháp</option>
        <option value="Đã duyệt">Đã duyệt</option>
        <option value="Đã chốt">Đã chốt</option>
      </select>

      <button onClick={onReset}>Làm mới</button>
    </div>
  );
}
