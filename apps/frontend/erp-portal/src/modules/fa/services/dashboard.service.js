// apps/frontend/erp-portal/src/modules/finance/services/dashboard.service.js

import { faAccountService } from "./faAccount.service";
import { receiptService } from "./receipt.service"; // Service Thu
import { paymentSlipService } from "./paymentSlip.service"; // Service Chi

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3003";
const ENDPOINTS = {
  TRANSACTIONS: `${API_URL}/cash_transactions`,
};

const TRANSACTION_TYPE = {
  RECEIPT: "RECEIPT", // Thu
  PAYMENT: "PAYMENT", // Chi
};

const ACCOUNT_CODES = {
  CASH: "111",      // Tiền mặt
  BANK: "112",      // Tiền gửi ngân hàng
  RECEIVABLE: "131", // Phải thu
  PAYABLE: "331",    // Phải trả
};

/* =========================
 * Helpers
 * ========================= */
const getStartOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getTodayString = () => {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
};

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

/* =========================
 * Internal Logic (Calculation)
 * ========================= */

/**
 * Tính toán dòng tiền (Thu - Chi) & Số dư theo loại tài khoản
 */
const calculateCashFlowAndBalances = (transactions) => {
  const startOfMonth = getStartOfMonth().getTime();

  let totalIncomeMonth = 0;   // Tổng thu tháng này
  let totalExpenseMonth = 0;  // Tổng chi tháng này
  
  let currentCashBalance = 0; // Dư tiền mặt (cộng dồn từ trước đến nay)
  let currentBankBalance = 0; // Dư ngân hàng (cộng dồn từ trước đến nay)

  transactions.forEach((t) => {
    if (isSoftDeleted(t.deleted_at)) return;

    const amount = Number(t.amount) || 0;
    const tDate = new Date(t.created_at).getTime();
    const isThisMonth = tDate >= startOfMonth;

    // 1. Tính toán Số dư hiện tại (Balance)
    // Logic: 
    // - Nếu là Thu (Receipt): Tăng tiền mặt/NH
    // - Nếu là Chi (Payment): Giảm tiền mặt/NH
    if (t.transaction_type === TRANSACTION_TYPE.RECEIPT) {
      if (t.debit_account_code === ACCOUNT_CODES.CASH) currentCashBalance += amount;
      if (t.debit_account_code === ACCOUNT_CODES.BANK) currentBankBalance += amount;
      
      // Tính doanh thu tháng
      if (isThisMonth) totalIncomeMonth += amount;

    } else if (t.transaction_type === TRANSACTION_TYPE.PAYMENT) {
      if (t.credit_account_code === ACCOUNT_CODES.CASH) currentCashBalance -= amount;
      if (t.credit_account_code === ACCOUNT_CODES.BANK) currentBankBalance -= amount;

      // Tính chi phí tháng
      if (isThisMonth) totalExpenseMonth += amount;
    }
  });

  return {
    monthStats: {
      income: totalIncomeMonth,
      expense: totalExpenseMonth,
      netFlow: totalIncomeMonth - totalExpenseMonth // Dòng tiền ròng
    },
    balances: {
      cash: currentCashBalance,
      bank: currentBankBalance,
      total: currentCashBalance + currentBankBalance
    }
  };
};

/**
 * Tạo dữ liệu biểu đồ dòng tiền theo ngày (7 ngày hoặc 30 ngày)
 */
const processChartData = (transactions) => {
  const chartMap = {};

  transactions.forEach((t) => {
    if (isSoftDeleted(t.deleted_at)) return;

    const dateKey = t.created_at.split("T")[0]; // YYYY-MM-DD

    if (!chartMap[dateKey]) {
      chartMap[dateKey] = { date: dateKey, revenue: 0, expense: 0 };
    }

    if (t.transaction_type === TRANSACTION_TYPE.RECEIPT) {
      chartMap[dateKey].revenue += Number(t.amount);
    } else if (t.transaction_type === TRANSACTION_TYPE.PAYMENT) {
      chartMap[dateKey].expense += Number(t.amount);
    }
  });

  // Chuyển object thành mảng và sort theo ngày
  return Object.values(chartMap).sort((a, b) => new Date(a.date) - new Date(b.date));
};

/* =========================
 * Main Service
 * ========================= */
export const dashboardService = {

  /**
   * Lấy toàn bộ dữ liệu tổng hợp cho Dashboard Finance
   */
  async getSummary() {
    try {
      // 1. Fetch dữ liệu song song
      // Lưu ý: Ta fetch trực tiếp endpoint transactions để lấy raw data tính toán cho nhanh
      const [transactionsRes, accounts] = await Promise.all([
        fetch(ENDPOINTS.TRANSACTIONS).then(res => res.ok ? res.json() : []),
        faAccountService.getAll({ includeInactive: false })
      ]);

      const allTransactions = Array.isArray(transactionsRes) ? transactionsRes : [];

      // 2. Tính toán các chỉ số tài chính (Balances & Monthly Stats)
      const { monthStats, balances } = calculateCashFlowAndBalances(allTransactions);

      // 3. Lấy dữ liệu biểu đồ
      const chartData = processChartData(allTransactions);

      // 4. Lấy danh sách giao dịch gần đây (Top 5 mới nhất)
      const recentTransactions = allTransactions
        .filter(t => !isSoftDeleted(t.deleted_at))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map(t => ({
          id: t.id,
          date: t.created_at,
          type: t.transaction_type, // RECEIPT | PAYMENT
          description: t.description,
          amount: t.amount,
          partnerName: t.transaction_type === TRANSACTION_TYPE.RECEIPT ? "Khách hàng" : "Nhà cung cấp" // Placeholder nếu không join
        }));

      // 5. Thống kê cơ cấu tài khoản (Ví dụ: Đếm số lượng TK cấp 1)
      const accountStructure = {
        totalAccounts: accounts.length,
        cashAccounts: accounts.filter(a => a.account_code.startsWith("11")).length,
        receivableAccounts: accounts.filter(a => a.account_code.startsWith("13")).length,
        payableAccounts: accounts.filter(a => a.account_code.startsWith("33")).length,
      };

      return {
        monthStats,           // { income, expense, netFlow }
        balances,             // { cash, bank, total }
        accountStructure,     // Thống kê số lượng tài khoản trong hệ thống
        recentTransactions,   // List 5 giao dịch
        charts: {
          cashFlowTrend: chartData // Dữ liệu biểu đồ cột/đường
        }
      };

    } catch (error) {
      console.error("Finance Dashboard Error:", error);
      throw new Error("Không thể tải dữ liệu Dashboard Tài chính");
    }
  },

  /**
   * Lấy chi tiết tỷ lệ chi phí theo đầu mục tài khoản (Account Breakdown)
   * Dùng cho biểu đồ tròn (Pie Chart) - Top chi phí
   */
  async getExpenseBreakdown() {
    try {
      const response = await fetch(`${ENDPOINTS.TRANSACTIONS}?transaction_type=${TRANSACTION_TYPE.PAYMENT}`);
      const data = await response.json();
      
      const expenseMap = {};

      data.forEach(t => {
        if (isSoftDeleted(t.deleted_at)) return;
        
        // Group theo tài khoản đối ứng (TK Nợ - Debit Account - Ví dụ: 642, 641...)
        // Trong Phiếu Chi: Nợ TK Chi phí / Có TK Tiền
        const expenseAccount = t.debit_account_code || "Khác";
        
        if (!expenseMap[expenseAccount]) {
          expenseMap[expenseAccount] = 0;
        }
        expenseMap[expenseAccount] += Number(t.amount);
      });

      // Chuyển về dạng mảng và lấy Top 5 chi phí lớn nhất
      const result = Object.entries(expenseMap)
        .map(([code, value]) => ({ code, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5

      return result;

    } catch (error) {
      console.error("Expense Breakdown Error:", error);
      return [];
    }
  },

  /**
   * Export dữ liệu báo cáo nhanh
   */
  async getExportData() {
    try {
      const summary = await this.getSummary();
      const expenseBreakdown = await this.getExpenseBreakdown();
      
      return {
        summary,
        expenseBreakdown,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error("Lỗi xuất dữ liệu báo cáo");
    }
  }
};