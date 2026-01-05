// components/layouts/BenefitForm.jsx

import "../styles/form.css";
import { useState } from "react";

export default function BenefitForm({ initialData, onSubmit, onCancel }) {
  const [form, setForm] = useState(
    initialData || {
      code: "",
      name: "",
      type: "Phụ cấp",
      amount: 0,
      status: "Hoạt động",
    }
  );

  const handleChange = (f, v) => setForm({ ...form, [f]: v });

  return (
    <div className="form">
      <input
        placeholder="Mã"
        disabled={!!initialData}
        value={form.code}
        onChange={(e) => handleChange("code", e.target.value)}
      />
      <input
        placeholder="Tên"
        value={form.name}
        onChange={(e) => handleChange("name", e.target.value)}
      />
      <select
        value={form.type}
        onChange={(e) => handleChange("type", e.target.value)}
      >
        <option>Phụ cấp</option>
        <option>Bảo hiểm</option>
        <option>Thưởng</option>
        <option>Khác</option>
      </select>
      <input
        type="number"
        value={form.amount}
        onChange={(e) => handleChange("amount", Number(e.target.value))}
      />

      <button className="primary-btn" onClick={() => onSubmit(form)}>
        Lưu
      </button>
      <button onClick={onCancel}>Hủy</button>
    </div>
  );
}
