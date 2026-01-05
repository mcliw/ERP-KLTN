// components/layouts/BenefitAssignForm.jsx

import "../styles/form.css";
import { useState } from "react";

export default function BenefitAssignForm({
  employees,
  benefits,
  onSubmit,
}) {
  const [form, setForm] = useState({
    employeeCode: "",
    benefitCode: "",
    effectiveFrom: "",
  });

  return (
    <div className="form">
      <select
        onChange={(e) =>
          setForm({ ...form, employeeCode: e.target.value })
        }
      >
        <option value="">-- Nhân viên --</option>
        {employees.map((e) => (
          <option key={e.code} value={e.code}>
            {e.name}
          </option>
        ))}
      </select>

      <select
        onChange={(e) =>
          setForm({ ...form, benefitCode: e.target.value })
        }
      >
        <option value="">-- Phúc lợi --</option>
        {benefits.map((b) => (
          <option key={b.code} value={b.code}>
            {b.name}
          </option>
        ))}
      </select>

      <input
        type="date"
        onChange={(e) =>
          setForm({ ...form, effectiveFrom: e.target.value })
        }
      />

      <button className="primary-btn" onClick={() => onSubmit(form)}>
        Gán
      </button>
    </div>
  );
}
