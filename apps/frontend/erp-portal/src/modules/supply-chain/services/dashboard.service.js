/* =========================
 * Config & Constants
 * ========================= */
const API_BASE_URL = "http://localhost:3002";

const ENDPOINTS = {
  PRODUCTS: `${API_BASE_URL}/products`,
  CATEGORIES: `${API_BASE_URL}/product_categories`,
  SUPPLIERS: `${API_BASE_URL}/suppliers`,
  WAREHOUSES: `${API_BASE_URL}/warehouses`,
  PRS: `${API_BASE_URL}/purchase_requests`,
  POS: `${API_BASE_URL}/purchase_orders`,
};

// Import Enum Status từ các service khác (Hardcode lại để đảm bảo tính độc lập cho dashboard)
const PO_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

const SUPPLIER_STATUS = {
  ACTIVE: "Đang hợp tác",
};

/* =========================
 * Helpers
 * ========================= */
const isSoftDeleted = (item) =>
  !!(item?.deletedAt && String(item.deletedAt).trim() !== "");

const handleResponse = async (response) => {
  if (!response.ok) return []; // Dashboard nên return mảng rỗng thay vì throw lỗi để không crash UI
  return response.json();
};

// Helper fetch nhanh danh sách và lọc soft delete
const fetchAndFilter = async (url) => {
  try {
    const res = await fetch(url);
    const data = await handleResponse(res);
    return Array.isArray(data)
      ? data.filter((item) => !isSoftDeleted(item))
      : [];
  } catch (error) {
    console.error(`Dashboard fetch error: ${url}`, error);
    return [];
  }
};

/* =========================
 * Main Dashboard Service
 * ========================= */
export const dashboardService = {
  /**
   * Lấy các chỉ số tổng quan (Top Cards)
   * - Tổng số sản phẩm
   * - Nhà cung cấp đang hoạt động
   * - PR đang chờ xử lý (DRAFT/PENDING)
   * - PO đang chờ duyệt (PENDING)
   */
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

      // Giả định PR trạng thái DRAFT hoặc chưa có status là đang chờ
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

  /**
   * Lấy dữ liệu phân bổ sản phẩm theo danh mục (Pie Chart)
   */
  async getProductDistribution() {
    try {
      const [products, categories] = await Promise.all([
        fetchAndFilter(ENDPOINTS.PRODUCTS),
        fetchAndFilter(ENDPOINTS.CATEGORIES),
      ]);

      // Map ID -> Name
      const categoryMap = categories.reduce((acc, cat) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {});

      // Đếm số lượng sản phẩm theo categoryId
      const distribution = products.reduce((acc, p) => {
        const catName = categoryMap[p.categoryId] || "Chưa phân loại";
        acc[catName] = (acc[catName] || 0) + 1;
        return acc;
      }, {});

      // Format cho biểu đồ (e.g., Recharts / ChartJS)
      return Object.keys(distribution).map((key) => ({
        name: key,
        value: distribution[key],
      }));
    } catch (error) {
      return [];
    }
  },

  /**
   * Lấy dữ liệu trạng thái đơn mua hàng (Bar/Donut Chart)
   * Và tổng chi tiêu của các đơn đã hoàn thành/duyệt
   */
  async getPOAnalytics() {
    try {
      const pos = await fetchAndFilter(ENDPOINTS.POS);

      // 1. Thống kê theo trạng thái
      const statusCounts = pos.reduce((acc, po) => {
        const status = po.status || "UNKNOWN";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // 2. Tính tổng chi tiêu (Chỉ tính các đơn APPROVED hoặc COMPLETED)
      const totalSpend = pos.reduce((sum, po) => {
        if (
          po.status === PO_STATUS.APPROVED ||
          po.status === PO_STATUS.COMPLETED
        ) {
          return sum + (Number(po.total_amount) || 0);
        }
        return sum;
      }, 0);

      // Format data cho biểu đồ status
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

  /**
   * Lấy danh sách hoạt động gần đây (Mixed PR & PO timeline)
   * Lấy 5-10 items mới nhất dựa trên ngày tạo/ngày đặt hàng
   */
  async getRecentActivities(limit = 5) {
    try {
      const [prs, pos] = await Promise.all([
        fetchAndFilter(ENDPOINTS.PRS),
        fetchAndFilter(ENDPOINTS.POS),
      ]);

      // Chuẩn hóa cấu trúc để hiển thị trên list
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

      // Gộp và sắp xếp giảm dần theo thời gian
      const activities = [...normalizedPRs, ...normalizedPOs]
        .sort((a, b) => b.date - a.date)
        .slice(0, limit);

      return activities;
    } catch (error) {
      return [];
    }
  },

  /**
   * (Nâng cao) Thống kê chi tiêu theo tháng trong năm hiện tại
   * Dùng cho biểu đồ Line/Area chart
   */
  async getMonthlySpend() {
    try {
      const pos = await fetchAndFilter(ENDPOINTS.POS);
      const currentYear = new Date().getFullYear();

      // Khởi tạo mảng 12 tháng
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: `T${i + 1}`,
        amount: 0,
      }));

      pos.forEach((po) => {
        // Chỉ tính đơn đã duyệt/hoàn thành
        if (
          [PO_STATUS.APPROVED, PO_STATUS.COMPLETED].includes(po.status) &&
          po.order_date
        ) {
          const date = new Date(po.order_date);
          if (date.getFullYear() === currentYear) {
            const monthIndex = date.getMonth(); // 0-11
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