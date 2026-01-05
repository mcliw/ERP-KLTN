// pages/layouts/PayrollDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { payrollService } from "../../services/payroll.service";
import PayslipTable from "../../components/layouts/PayslipTable";

export default function PayrollDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [payroll, setPayroll] = useState(null);

  useEffect(() => {
    payrollService.getById(id).then(setPayroll);
  }, [id]);

  if (!payroll) return <div>Đang tải...</div>;

  const locked = payroll.status === "Đã chốt";

  const handleSave = async () => {
    const updated = await payrollService.updateItems(
      payroll.id,
      payroll.items
    );
    setPayroll(updated);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Kỳ lương {payroll.period}</h2>
      <p>Trạng thái: {payroll.status}</p>

      <PayslipTable
        items={payroll.items}
        disabled={locked}
        onChange={(items) => setPayroll({ ...payroll, items })}
      />

      {!locked && (
        <button className="primary-btn" onClick={handleSave}>
          Lưu
        </button>
      )}

      <button onClick={() => navigate(-1)}>Quay lại</button>
    </div>
  );
}
