// apps/frontend/erp-portal/src/modules/sales/services/dashboard.service.js

import { orderService } from "./order.service";
import { customerService } from "./customer.service";
import { voucherService } from "./voucher.service";

/* =========================
 * Config & Constants
 * ========================= */
const ORDER_STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  SHIPPING: "SHIPPING",
};

const VOUCHER_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

/* =========================
 * Helpers
 * ========================= */
const getStartOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

/* =========================
 * Internal Logic (Calculation)
 * ========================= */

const calculateRevenueStats = (orders) => {
  const startOfMonth = getStartOfMonth().getTime();
  const thisMonthOrders = orders.filter(o => 
    new Date(o.created_at).getTime() >= startOfMonth
  );

  const totalRevenue = thisMonthOrders
    .filter(o => o.order_status === ORDER_STATUS.COMPLETED)
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const totalOrders = thisMonthOrders.length;
  const pendingOrders = thisMonthOrders.filter(o => o.order_status === ORDER_STATUS.PENDING).length;

  return {
    totalRevenue,
    totalOrders,
    pendingOrders,
    avgOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders) : 0
  };
};

const calculateCustomerGrowth = (customers) => {
  const startOfMonth = getStartOfMonth().getTime();
  const newCustomers = customers.filter(c => 
    new Date(c.created_at).getTime() >= startOfMonth
  ).length;

  const totalCustomers = customers.length;

  return {
    totalCustomers,
    newCustomers,
    growthRate: totalCustomers > 0 ? ((newCustomers / (totalCustomers - newCustomers || 1)) * 100).toFixed(1) : 0
  };
};

const calculateOrderStatusDistribution = (orders) => {
  const distribution = {
    [ORDER_STATUS.COMPLETED]: 0,
    [ORDER_STATUS.PENDING]: 0,
    [ORDER_STATUS.SHIPPING]: 0,
    [ORDER_STATUS.CANCELLED]: 0,
  };

  orders.forEach(o => {
    if (distribution[o.order_status] !== undefined) {
      distribution[o.order_status]++;
    }
  });

  return Object.keys(distribution).map(key => ({
    name: key, 
    value: distribution[key]
  }));
};

const calculateVoucherPerformance = (vouchers) => {
  const activeCount = vouchers.filter(v => v.status === VOUCHER_STATUS.ACTIVE).length;
  // Giả định sort theo usage_count nếu có
  const topVouchers = [...vouchers]
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 5);

  return {
    activeCount,
    topVouchers
  };
};

/* =========================
 * Main Service
 * ========================= */
export const dashboardService = {
  /**
   * Lấy toàn bộ dữ liệu tổng hợp cho Dashboard Sales
   */
  async getSummary() {
    try {
      // Các service con (order, customer, voucher) đã được chuyển sang axiosClient
      // và được thiết kế để trả về mảng rỗng [] nếu lỗi, nên Promise.all an toàn.
      const [
        orders,
        customers,
        vouchers,
      ] = await Promise.all([
        orderService.getAll({ limit: 1000 }), 
        customerService.getAll({ includeDeleted: false }),
        voucherService.getAll({ includeDeleted: false }),
      ]);

      const revenueStats = calculateRevenueStats(orders);
      const customerStats = calculateCustomerGrowth(customers);
      const orderStatusData = calculateOrderStatusDistribution(orders);
      const voucherStats = calculateVoucherPerformance(vouchers);

      const pendingOrdersList = orders
        .filter(o => o.order_status === ORDER_STATUS.PENDING)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      return {
        revenueStats,
        customerStats,
        voucherStats,
        charts: {
          orderStatusData: orderStatusData,
        },
        widgets: {
          pendingOrdersCount: revenueStats.pendingOrders,
          pendingOrdersList: pendingOrdersList,
        }
      };

    } catch (error) {
      console.error("Sales Dashboard Service Error:", error);
      throw new Error("Không thể tải dữ liệu Dashboard Bán hàng");
    }
  },

  /**
   * Lấy dữ liệu biểu đồ doanh thu 7 ngày gần nhất
   */
  async getWeeklyRevenueTrend() {
    try {
      const dates = [];
      const requests = [];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dates.push(dateStr);
        
        // Gọi orderService đã update
        requests.push(orderService.getAll({ date: dateStr })); 
      }

      const results = await Promise.all(requests);

      return dates.map((date, index) => {
        const dailyOrders = results[index] || [];
        
        const dailyRevenue = dailyOrders
          .filter(o => o.order_status === ORDER_STATUS.COMPLETED)
          .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
          
        const orderCount = dailyOrders.length;

        return {
          date: date.split("-").slice(1).join("/"), // MM/DD
          "Doanh thu": dailyRevenue,
          "Số đơn": orderCount
        };
      });

    } catch (error) {
      console.error("Weekly Revenue Trend Error:", error);
      return [];
    }
  },

  async getExportData() {
    try {
      const summary = await this.getSummary();
      const orders = await orderService.getAll({});
      const customers = await customerService.getAll({});

      return {
        summary,
        orders,
        customers
      };
    } catch (error) {
      console.error("Export Data Error:", error);
      throw new Error("Không thể lấy dữ liệu xuất báo cáo");
    }
  }
};