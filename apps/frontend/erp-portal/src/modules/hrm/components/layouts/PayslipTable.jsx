// components/layouts/PayslipTable.jsx
export default function PayslipTable({ items, disabled, onChange }) {
  const handleChange = (idx, field, value) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: Number(value) || 0 };
    onChange(next);
  };

  return (
    <table className="main-table">
      <thead>
        <tr>
          <th>NV</th>
          <th>Lương CB</th>
          <th>Phụ cấp</th>
          <th>Thưởng</th>
          <th>Khấu trừ</th>
          <th>Bảo hiểm</th>
          <th>Thuế</th>
          <th>Thực lãnh</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={it.employeeCode}>
            <td>{it.employeeCode}</td>
            {[
              "baseSalary",
              "allowance",
              "bonus",
              "deduction",
              "insurance",
              "tax",
            ].map((f) => (
              <td key={f}>
                <input
                  type="number"
                  disabled={disabled}
                  value={it[f]}
                  onChange={(e) => handleChange(i, f, e.target.value)}
                />
              </td>
            ))}
            <td>{it.netPay.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
