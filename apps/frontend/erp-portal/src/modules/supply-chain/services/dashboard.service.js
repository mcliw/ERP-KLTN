import { axiosClient } from "../../../services/axiosClient";

const API_BASE_URL = "/supply-chain";

const ENDPOINTS = {
  PRODUCTS: `${API_BASE_URL}/products`,
  CATEGORIES: `${API_BASE_URL}/product_categories`,
  SUPPLIERS: `${API_BASE_URL}/suppliers`,
  WAREHOUSES: `${API_BASE_URL}/warehouses`,
  PRS: `${API_BASE_URL}/purchase_requests`,
  POS: `${API_BASE_URL}/purchase_orders`,
};

const PO_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

const SUPPLIER_STATUS = {
  ACTIVE: "Đang hợp tác",
};

const isSoftDeleted = (item) =>
  !!(item?.deletedAt && String(item.deletedAt).trim() !== "");

const fetchAndFilter = async (url) => {
  try {
    const data = await axiosClient.get(url);
    return Array.isArray(data)
      ? data.filter((item) => !isSoftDeleted(item))
      : [];
  } catch (error) {
    console.error(`Dashboard fetch error: ${url}`, error);
    return [];
  }
};

export const dashboardService = {
  async getOverviewStats() {
    try {
      const [products, suppliers, prs, pos] = await Promise.all([
        fetchAndFilter(ENDPOINTS.PRODUCTS),
        fetchAndFilter(ENDPOINTS.SUPPLIERS),
        fetchAndFilter(ENDPOINTS.PRS),
        fetchAndFilter(ENDPOINTS.POS),
      ]);

      const activeSuppliers = suppliers.filter(
        (s) => s.status === SUPPLIER_STATUS.ACTIVE
      );

      const pendingPRs = prs.filter(
        (p) => !p.status || p.status === "DRAFT" || p.status === "PENDING"
      );

      const pendingPOs = pos.filter((p) => p.status === PO_STATUS.PENDING);

      return {
        totalProducts: products.length,
        activeSuppliers: activeSuppliers.length,
        pendingPRs: pendingPRs.length,
        pendingPOs: pendingPOs.length,
      };
    } catch (error) {
      console.error("Lỗi lấy số liệu tổng quan:", error);
      return {
        totalProducts: 0,
        activeSuppliers: 0,
        pendingPRs: 0,
        pendingPOs: 0,
      };
    }
  },

  async getProductDistribution() {
    try {
      const [products, categories] = await Promise.all([
        fetchAndFilter(ENDPOINTS.PRODUCTS),
        fetchAndFilter(ENDPOINTS.CATEGORIES),
      ]);

      const categoryMap = categories.reduce((acc, cat) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {});

      const distribution = products.reduce((acc, p) => {
        const catName = categoryMap[p.categoryId] || "Chưa phân loại";
        acc[catName] = (acc[catName] || 0) + 1;
        return acc;
      }, {});

      return Object.keys(distribution).map((key) => ({
        name: key,
        value: distribution[key],
      }));
    } catch (error) {
      return [];
    }
  },

  async getPOAnalytics() {
    try {
      const pos = await fetchAndFilter(ENDPOINTS.POS);

      const statusCounts = pos.reduce((acc, po) => {
        const status = po.status || "UNKNOWN";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const totalSpend = pos.reduce((sum, po) => {
        if (
          po.status === PO_STATUS.APPROVED ||
          po.status === PO_STATUS.COMPLETED
        ) {
          return sum + (Number(po.total_amount) || 0);
        }
        return sum;
      }, 0);

      const chartData = Object.keys(statusCounts).map((key) => ({
        name: key,
        count: statusCounts[key],
      }));

      return {
        chartData,
        totalSpend,
      };
    } catch (error) {
      return { chartData: [], totalSpend: 0 };
    }
  },

  async getRecentActivities(limit = 5) {
    try {
      const [prs, pos] = await Promise.all([
        fetchAndFilter(ENDPOINTS.PRS),
        fetchAndFilter(ENDPOINTS.POS),
      ]);

      const normalizedPRs = prs.map((pr) => ({
        id: pr.id,
        type: "PR",
        code: pr.pr_code,
        date: new Date(pr.createdAt || pr.request_date),
        status: pr.status,
        description: `Yêu cầu mua hàng từ ${pr.requester_id || "N/A"}`,
      }));

      const normalizedPOs = pos.map((po) => ({
        id: po.id,
        type: "PO",
        code: po.po_code,
        date: new Date(po.createdAt || po.order_date),
        status: po.status,
        description: `Đơn đặt hàng trị giá ${new Intl.NumberFormat(
          "vi-VN"
        ).format(po.total_amount || 0)} đ`,
      }));

      const activities = [...normalizedPRs, ...normalizedPOs]
        .sort((a, b) => b.date - a.date)
        .slice(0, limit);

      return activities;
    } catch (error) {
      return [];
    }
  },

  async getMonthlySpend() {
    try {
      const pos = await fetchAndFilter(ENDPOINTS.POS);
      const currentYear = new Date().getFullYear();

      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: `T${i + 1}`,
        amount: 0,
      }));

      pos.forEach((po) => {
        if (
          [PO_STATUS.APPROVED, PO_STATUS.COMPLETED].includes(po.status) &&
          po.order_date
        ) {
          const date = new Date(po.order_date);
          if (date.getFullYear() === currentYear) {
            const monthIndex = date.getMonth(); 
            monthlyData[monthIndex].amount += Number(po.total_amount) || 0;
          }
        }
      });

      return monthlyData;
    } catch (error) {
      return [];
    }
  },
};