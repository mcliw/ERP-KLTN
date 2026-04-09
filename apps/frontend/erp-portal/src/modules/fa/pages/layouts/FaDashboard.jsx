// apps/frontend/erp-portal/src/modules/finance/pages/Dashboard.jsx

import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { 
  FaMoneyBillWave, FaExchangeAlt, FaFileInvoiceDollar, 
  FaChartLine, FaWallet, FaFileDownload, FaUniversity, 
  FaArrowUp, FaArrowDown, FaListOl
} from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Components
import StatCard from "../../../../shared/components/StatCard";
import QuickAction from "../../../../shared/components/QuickAction";
import { useToast } from "../../../../shared/components/ToastProvider";

// Services
import { dashboardService } from "../../services/dashboard.service";

// Utils
import { useAuthStore } from "../../../../auth/auth.store";

// Import CSS chung (giữ nguyên style như HRM)
import "../../../../shared/styles/dashboard.css";

/* =====================
 * Helpers & Sub-Components
 * ===================== */

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// 1. Biểu đồ so sánh Thu - Chi (CSS Thuần)
const IncomeExpenseChart = ({ income, expense }) => {
  const total = income + expense;
  // Tránh chia cho 0
  const incomePercent = total > 0 ? (income / total) * 100 : 0;
  const expensePercent = total > 0 ? (expense / total) * 100 : 0;

  return (
    <div className="chart-container">
      <div className="d-flex justify-content-between mb-3">
        <strong>Tỷ trọng Thu / Chi (Tháng này)</strong>
        <small className="text-muted" style={{marginLeft: 0}}>{new Date().toLocaleDateString('vi-VN')}</small>
      </div>

      {/* Bar: Thu */}
      <div className="chart-row mb-3">
        <div className="chart-label d-flex align-items-center justify-content-between mb-1">
          <span><FaArrowUp className="text-success me-1"/> Thu nhập</span>
          <span className="fw-bold">{formatCurrency(income)}</span>
        </div>
        <div className="chart-bar-area">
          <div className="chart-bar-fill bg-success" style={{ width: `${incomePercent}%` }}></div>
        </div>
      </div>

      {/* Bar: Chi */}
      <div className="chart-row">
        <div className="chart-label d-flex align-items-center justify-content-between mb-1">
          <span><FaArrowDown className="text-danger me-1"/> Chi phí</span>
          <span className="fw-bold">{formatCurrency(expense)}</span>
        </div>
        <div className="chart-bar-area">
          <div className="chart-bar-fill bg-danger" style={{ width: `${expensePercent}%` }}></div>
        </div>
      </div>
    </div>
  );
};

// 2. Biểu đồ cấu trúc tài sản (Tiền mặt vs Ngân hàng)
const BalanceStructure = ({ balances }) => {
  if (!balances) return null;
  const { cash, bank, total } = balances;
  
  const cashPercent = total > 0 ? (cash / total) * 100 : 0;
  const bankPercent = total > 0 ? (bank / total) * 100 : 0;

  const items = [
    { label: "Tiền mặt", value: cash, percent: cashPercent, color: "bg-info", icon: <FaMoneyBillWave/> },
    { label: "Tiền gửi ngân hàng", value: bank, percent: bankPercent, color: "bg-primary", icon: <FaUniversity/> }
  ];

  return (
    <div className="ratio-container">
      {items.map((item, index) => (
        <div key={index} className="ratio-item">
          <div className="ratio-header">
            <span className="ratio-name d-flex align-items-center">
              <span className="me-2 text-muted" style={{marginLeft: 0}}>{item.icon}</span> 
              <span>{item.label}</span>
            </span>
            <span className="ratio-percent">{item.percent.toFixed(1)}%</span>
          </div>
          <div className="progress-bg">
             <div className={`progress-fill ${item.color}`} style={{ width: `${item.percent}%` }}></div>
          </div>
          <div className="ratio-detail text-muted fw-bold mt-1">
            {formatCurrency(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
};

// 3. Bảng giao dịch gần đây (Simple Table)
const RecentTransactionsTable = ({ transactions }) => {
  if (!transactions || transactions.length === 0) {
    return <div className="text-center text-muted py-3">Chưa có giao dịch nào gần đây.</div>;
  }

  return (
    <div className="table-responsive">
      <table className="main-table">
        <thead className="table-light">
          <tr>
            <th>Ngày</th>
            <th>Loại</th>
            <th>Đối tượng</th>
            <th>Diễn giải</th>
            <th className="text-end">Số tiền</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{new Date(t.date).toLocaleDateString('vi-VN')}</td>
              <td>
                <span className={`badge ${t.type === 'RECEIPT' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                  {t.type === 'RECEIPT' ? 'Phiếu Thu' : 'Phiếu Chi'}
                </span>
              </td>
              <td>{t.partnerName}</td>
              <td className="text-truncate" style={{maxWidth: "200px"}} title={t.description}>
                {t.description}
              </td>
              <td className={`text-end fw-bold ${t.type === 'RECEIPT' ? 'text-success' : 'text-danger'}`}>
                {t.type === 'RECEIPT' ? '+' : '-'}{formatCurrency(t.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* =====================
 * Main Component
 * ===================== */
export default function FaDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  // const user = useAuthStore((s) => s.user); // Nếu cần check quyền
  
  const [summary, setSummary] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // --- FETCH DATA ---
  const loadDashboard = useCallback(async () => {
    try {
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải dữ liệu tài chính: " + err.message);
    }
  }, [toast]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // --- EXPORT HANDLER ---
  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      toast.info("Đang tạo báo cáo tài chính...");

      // 1. Lấy dữ liệu báo cáo
      const { summary: exportSummary, expenseBreakdown } = await dashboardService.getExportData();

      const wb = XLSX.utils.book_new();

      // --- SHEET 1: TỔNG QUAN ---
      const overviewData = [
        ["BÁO CÁO TỔNG QUAN TÀI CHÍNH"],
        ["Ngày xuất", new Date().toLocaleDateString('vi-VN')],
        [""],
        ["TỔNG TÀI SẢN"],
        ["Tiền mặt", exportSummary.balances.cash],
        ["Tiền gửi ngân hàng", exportSummary.balances.bank],
        ["Tổng cộng", exportSummary.balances.total],
        [""],
        ["KẾT QUẢ KINH DOANH (THÁNG NÀY)"],
        ["Tổng thu", exportSummary.monthStats.income],
        ["Tổng chi", exportSummary.monthStats.expense],
        ["Dòng tiền ròng", exportSummary.monthStats.netFlow],
      ];
      const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, wsOverview, "Tổng quan");

      // --- SHEET 2: TOP CHI PHÍ ---
      if (expenseBreakdown && expenseBreakdown.length > 0) {
        const expenseHeader = [["Mã TK Chi phí", "Số tiền"]];
        const expenseRows = expenseBreakdown.map(e => [e.code, e.value]);
        const wsExpense = XLSX.utils.aoa_to_sheet([...expenseHeader, ...expenseRows]);
        XLSX.utils.book_append_sheet(wb, wsExpense, "Phân bổ chi phí");
      }

      // Xuất file
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const dataBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
      
      saveAs(dataBlob, `Bao_Cao_Tai_Chinh_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Xuất báo cáo thành công!");

    } catch (err) {
      console.error(err);
      toast.error("Lỗi xuất báo cáo: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // --- LOADING STATE ---
  if (!summary) {
    return <div className="p-4 text-center">Đang tải dữ liệu tài chính...</div>;
  }

  const { monthStats, balances, recentTransactions, accountStructure } = summary;

  return (
    <div className="dashboard-wrap">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">Dashboard Tài chính</h1>
          <p className="text-muted mb-0" style={{marginLeft: 0}}>Tổng quan dòng tiền và tài sản doanh nghiệp</p>
        </div>
        
        <button 
          className="btn-restore" 
          onClick={handleExportReport}
          disabled={isExporting}
        >
          {isExporting ? (
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          ) : (
            <FaFileDownload className="me-2" />
          )}
          <span>{isExporting ? "Đang xuất..." : "Xuất báo cáo"}</span>
        </button>
      </div>

      {/* 1. STATS CARDS */}
      <div className="stats">
        <StatCard 
          title="Tổng quỹ hiện có" 
          value={formatCurrency(balances.total)} 
          icon={<FaWallet className="text-primary"/>} 
          subText="Bao gồm Tiền mặt & Ngân hàng"
        />
        
        <StatCard 
          title="Tổng thu (Tháng)" 
          value={formatCurrency(monthStats.income)} 
          icon={<FaArrowUp className="text-success"/>} 
          subText="Doanh thu ghi nhận"
        />

        <StatCard 
          title="Tổng chi (Tháng)" 
          value={formatCurrency(monthStats.expense)} 
          icon={<FaArrowDown className="text-danger"/>} 
          subText="Chi phí hoạt động"
        />

        <StatCard 
          title="Dòng tiền ròng" 
          value={formatCurrency(monthStats.netFlow)} 
          icon={<FaChartLine className={monthStats.netFlow >= 0 ? "text-success" : "text-danger"}/>} 
          subText="Chênh lệch Thu - Chi"
        />
      </div>

      {/* 2. CHARTS SECTION */}
      <div className="dashboard-grid mt-4">
        {/* Chart 1: Thu vs Chi */}
        <div className="dashboard-card">
          <div className="card-header">
            <FaExchangeAlt className="me-2 text-warning" />
            <span>Tình hình Thu - Chi tháng này</span>
          </div>
          <div className="card-body">
            <IncomeExpenseChart 
              income={monthStats.income} 
              expense={monthStats.expense} 
            />
          </div>
        </div>

        {/* Chart 2: Cơ cấu tài sản */}
        <div className="dashboard-card">
          <div className="card-header">
            <FaChartLine className="me-2 text-info" />
            <span>Cơ cấu nguồn vốn lưu động</span>
          </div>
          <div className="card-body">
             <BalanceStructure balances={balances} />
             <div className="mt-3 pt-3 border-top">
                <small className="text-muted" style={{marginLeft: 0}}>Tổng số tài khoản trong hệ thống: <strong>{accountStructure?.totalAccounts}</strong></small>
             </div>
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS */}
      <h3 className="section-title mt-4">Nghiệp vụ thường dùng</h3>
      <div className="actions">
        <QuickAction 
            label="Lập phiếu thu" 
            icon={<FaFileInvoiceDollar />} 
            onClick={() => navigate("/finance/phieu-thu/them-moi")} 
        />
        <QuickAction 
            label="Lập phiếu chi" 
            icon={<FaMoneyBillWave />} 
            onClick={() => navigate("/finance/phieu-chi/them-moi")}
        />
        <QuickAction 
            label="Hệ thống TK" 
            icon={<FaListOl />} 
            onClick={() => navigate("/finance/he-thong-tai-khoan")}
        />
        <QuickAction 
            label="Định khoản mẫu" 
            icon={<FaChartLine />} 
            onClick={() => navigate("/finance/dinh-khoan")} 
        />
      </div>

      {/* 4. RECENT TRANSACTIONS */}
      <h3 className="section-title mt-4">Giao dịch gần đây</h3>
      <div className="card shadow-sm border-0">
        <RecentTransactionsTable transactions={recentTransactions} />
      </div>

    </div>
  );
}