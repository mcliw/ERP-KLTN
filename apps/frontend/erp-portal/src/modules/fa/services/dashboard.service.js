// apps/frontend/erp-portal/src/modules/finance/services/dashboard.service.js

import { axiosClient } from "../../../services/axiosClient";
import { faAccountService } from "./faAccount.service";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "/accounting";
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

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

/* =========================
 * Internal Logic (Calculation)
 * ========================= */

const calculateCashFlowAndBalances = (transactions) => {
  const startOfMonth = getStartOfMonth().getTime();

  let totalIncomeMonth = 0;   
  let totalExpenseMonth = 0;  
  
  let currentCashBalance = 0; 
  let currentBankBalance = 0; 

  transactions.forEach((t) => {
    if (isSoftDeleted(t.deleted_at)) return;

    const amount = Number(t.amount) || 0;
    const tDate = new Date(t.created_at).getTime();
    const isThisMonth = tDate >= startOfMonth;

    if (t.transaction_type === TRANSACTION_TYPE.RECEIPT) {
      if (t.debit_account_code === ACCOUNT_CODES.CASH) currentCashBalance += amount;
      if (t.debit_account_code === ACCOUNT_CODES.BANK) currentBankBalance += amount;
      
      if (isThisMonth) totalIncomeMonth += amount;

    } else if (t.transaction_type === TRANSACTION_TYPE.PAYMENT) {
      if (t.credit_account_code === ACCOUNT_CODES.CASH) currentCashBalance -= amount;
      if (t.credit_account_code === ACCOUNT_CODES.BANK) currentBankBalance -= amount;

      if (isThisMonth) totalExpenseMonth += amount;
    }
  });

  return {
    monthStats: {
      income: totalIncomeMonth,
      expense: totalExpenseMonth,
      netFlow: totalIncomeMonth - totalExpenseMonth 
    },
    balances: {
      cash: currentCashBalance,
      bank: currentBankBalance,
      total: currentCashBalance + currentBankBalance
    }
  };
};

const processChartData = (transactions) => {
  const chartMap = {};

  transactions.forEach((t) => {
    if (isSoftDeleted(t.deleted_at)) return;

    const dateKey = t.created_at.split("T")[0]; 

    if (!chartMap[dateKey]) {
      chartMap[dateKey] = { date: dateKey, revenue: 0, expense: 0 };
    }

    if (t.transaction_type === TRANSACTION_TYPE.RECEIPT) {
      chartMap[dateKey].revenue += Number(t.amount);
    } else if (t.transaction_type === TRANSACTION_TYPE.PAYMENT) {
      chartMap[dateKey].expense += Number(t.amount);
    }
  });

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
      // 1. Fetch dữ liệu song song dùng axiosClient
      const [transactionsData, accounts] = await Promise.all([
        axiosClient.get(ENDPOINTS.TRANSACTIONS).catch(() => []),
        faAccountService.getAll({ includeInactive: false })
      ]);

      // Axios trả về data trực tiếp, không cần res.json()
      const allTransactions = Array.isArray(transactionsData) ? transactionsData : [];

      // 2. Tính toán các chỉ số tài chính
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
          type: t.transaction_type, 
          description: t.description,
          amount: t.amount,
          partnerName: t.transaction_type === TRANSACTION_TYPE.RECEIPT ? "Khách hàng" : "Nhà cung cấp"
        }));

      // 5. Thống kê cơ cấu tài khoản
      const accountStructure = {
        totalAccounts: accounts.length,
        cashAccounts: accounts.filter(a => a.account_code.startsWith("11")).length,
        receivableAccounts: accounts.filter(a => a.account_code.startsWith("13")).length,
        payableAccounts: accounts.filter(a => a.account_code.startsWith("33")).length,
      };

      return {
        monthStats,           
        balances,             
        accountStructure,     
        recentTransactions,   
        charts: {
          cashFlowTrend: chartData 
        }
      };

    } catch (error) {
      console.error("Finance Dashboard Error:", error);
      throw new Error("Không thể tải dữ liệu Dashboard Tài chính");
    }
  },

  /**
   * Lấy chi tiết tỷ lệ chi phí theo đầu mục tài khoản
   */
  async getExpenseBreakdown() {
    try {
      const data = await axiosClient.get(`${ENDPOINTS.TRANSACTIONS}?transaction_type=${TRANSACTION_TYPE.PAYMENT}`);
      
      const expenseMap = {};

      (Array.isArray(data) ? data : []).forEach(t => {
        if (isSoftDeleted(t.deleted_at)) return;
        
        const expenseAccount = t.debit_account_code || "Khác";
        
        if (!expenseMap[expenseAccount]) {
          expenseMap[expenseAccount] = 0;
        }
        expenseMap[expenseAccount] += Number(t.amount);
      });

      const result = Object.entries(expenseMap)
        .map(([code, value]) => ({ code, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); 

      return result;

    } catch (error) {
      console.error("Expense Breakdown Error:", error);
      return [];
    }
  },

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