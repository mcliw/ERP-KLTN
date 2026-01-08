// pages/layouts/PayrollCreate.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { payrollService } from "../../services/payroll.service";

export default function PayrollCreate() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    try {
      await payrollService.generate(period);
      navigate("/hrm/luong");
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Tạo kỳ lương</h2>

      <input
        type="month"
        value={period}
        onChange={(e) => setPeriod(e.target.value)}
      />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button className="primary-btn" onClick={handleCreate}>
        Tạo
      </button>
      <button onClick={() => navigate(-1)}>Hủy</button>
    </div>
  );
}
