// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/Payroll.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { payrollService } from "../../services/payroll.service";
import PayrollTable from "../../components/layouts/PayrollTable";
import PayrollFilter from "../../components/layouts/PayrollFilter";
import { FaPlus } from "react-icons/fa";
import "../styles/document.css";
import "../../../../shared/styles/button.css"

export default function Payroll() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    payrollService.getAll().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return data.filter((p) => {
      const okPeriod = !period || p.period === period;
      const okStatus = !status || p.status === status;
      return okPeriod && okStatus;
    });
  }, [data, period, status]);

  const handleApprove = async (id) => {
    const updated = await payrollService.setStatus(id, "Đã duyệt");
    setData((prev) => prev.map((x) => (x.id === id ? updated : x)));
  };

  const handleClose = async (id) => {
    const updated = await payrollService.setStatus(id, "Đã chốt");
    setData((prev) => prev.map((x) => (x.id === id ? updated : x)));
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div style={{ padding: 20 }}>
      <div className="page-header">
        <h2>Quản lý Lương</h2>
        <button className="btn-primary" onClick={() => navigate("/hrm/luong/them-ky-luong")}>
          <FaPlus /> <span>Tạo kỳ lương</span>
        </button>
      </div>

      <PayrollFilter
        period={period}
        status={status}
        onPeriodChange={setPeriod}
        onStatusChange={setStatus}
        onReset={() => {
          setPeriod("");
          setStatus("");
        }}
      />

      <PayrollTable
        data={filtered}
        onRowClick={(row) => navigate(`/hrm/luong/${row.id}`)}
        onApprove={handleApprove}
        onClose={handleClose}
      />
    </div>
  );
}
