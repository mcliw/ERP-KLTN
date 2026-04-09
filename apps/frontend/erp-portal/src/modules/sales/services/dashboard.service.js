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

const getTodayString = () => {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
};

// Helper để format tiền tệ (nếu cần dùng trong logic tính toán chuỗi)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

/* =========================
 * Internal Logic (Calculation)
 * ========================= */

/**
 * Tính toán chỉ số doanh thu và đơn hàng trong tháng
 */
const calculateRevenueStats = (orders) => {
  const startOfMonth = getStartOfMonth().getTime();

  // Lọc các đơn hàng trong tháng này
  const thisMonthOrders = orders.filter(o => 
    new Date(o.created_at).getTime() >= startOfMonth
  );

  // Tổng doanh thu (Chỉ tính đơn COMPLETED)
  const totalRevenue = thisMonthOrders
    .filter(o => o.order_status === ORDER_STATUS.COMPLETED)
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Số lượng đơn hàng
  const totalOrders = thisMonthOrders.length;
  const pendingOrders = thisMonthOrders.filter(o => o.order_status === ORDER_STATUS.PENDING).length;

  return {
    totalRevenue,
    totalOrders,
    pendingOrders,
    avgOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders) : 0
  };
};

/**
 * Tính toán tăng trưởng khách hàng
 */
const calculateCustomerGrowth = (customers) => {
  const startOfMonth = getStartOfMonth().getTime();

  // Khách hàng mới trong tháng
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

/**
 * Thống kê phân bổ trạng thái đơn hàng (Dùng cho biểu đồ tròn)
 */
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

  // Chuyển đổi sang format mảng cho biểu đồ
  return Object.keys(distribution).map(key => ({
    name: key, // Có thể map sang tiếng Việt ở Component view
    value: distribution[key]
  }));
};

/**
 * Phân tích hiệu quả Voucher
 */
const calculateVoucherPerformance = (vouchers) => {
  // Đếm số lượng voucher đang active
  const activeCount = vouchers.filter(v => v.status === VOUCHER_STATUS.ACTIVE).length;
  
  // Top voucher được sử dụng nhiều nhất (Giả định có field usage_count hoặc calculate từ orders)
  // Ở đây giả định voucher object đã có usage_count từ backend
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
      // 1. Khởi chạy các request song song
      // Lưu ý: Trong thực tế nếu dữ liệu quá lớn, cần filter theo ngày ở BE thay vì fetch getAll
      const [
        orders,         // Lấy danh sách đơn hàng (có thể limit 1000 đơn gần nhất)
        customers,      // Lấy danh sách khách hàng
        vouchers,       // Lấy danh sách khuyến mãi
      ] = await Promise.all([
        orderService.getAll({ limit: 1000 }), 
        customerService.getAll({ includeDeleted: false }),
        voucherService.getAll({ includeDeleted: false }),
      ]);

      // 2. Xử lý số liệu Doanh thu & Đơn hàng (Tháng hiện tại)
      const revenueStats = calculateRevenueStats(orders);

      // 3. Xử lý số liệu Khách hàng
      const customerStats = calculateCustomerGrowth(customers);

      // 4. Xử lý phân bổ trạng thái đơn hàng (Chart Pie)
      const orderStatusData = calculateOrderStatusDistribution(orders);

      // 5. Xử lý thống kê Voucher
      const voucherStats = calculateVoucherPerformance(vouchers);

      // 6. Lấy danh sách đơn hàng cần xử lý gấp (Pending)
      const pendingOrdersList = orders
        .filter(o => o.order_status === ORDER_STATUS.PENDING)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      return {
        revenueStats,       // { totalRevenue, totalOrders, pendingOrders, avgOrderValue }
        customerStats,      // { totalCustomers, newCustomers, growthRate }
        voucherStats,       // { activeCount, topVouchers }
        
        charts: {
          orderStatusData: orderStatusData, // Array cho Pie Chart
        },
        
        widgets: {
          pendingOrdersCount: revenueStats.pendingOrders,
          pendingOrdersList: pendingOrdersList, // List chi tiết cho widget
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
      
      // Tạo mảng 7 ngày gần nhất
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dates.push(dateStr);
        
        // Gọi API lấy orders theo ngày cụ thể (Giả định service hỗ trợ filter by date)
        requests.push(orderService.getAll({ date: dateStr })); 
      }

      const results = await Promise.all(requests);

      // Map kết quả về format biểu đồ
      return dates.map((date, index) => {
        const dailyOrders = results[index] || [];
        
        // Tính doanh thu ngày hôm đó (chỉ tính đơn Completed)
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

  /**
   * Chuẩn bị dữ liệu để xuất báo cáo Excel
   */
  async getExportData() {
    try {
      // 1. Lấy dữ liệu tổng hợp
      const summary = await this.getSummary();

      // 2. Lấy danh sách đơn hàng đầy đủ
      const orders = await orderService.getAll({});
      
      // 3. Lấy danh sách khách hàng top chi tiêu (Logic ví dụ)
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