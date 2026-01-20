// apps/frontend/erp-portal/src/modules/sales/pages/SalesDashboard.jsx

import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  FaUserPlus, FaShoppingCart, FaMoneyBillWave, 
  FaChartPie, FaChartBar, FaTicketAlt, FaFileInvoiceDollar, 
  FaFileDownload, FaClipboardList, FaUsers
} from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Components
import StatCard from "../../../../shared/components/StatCard";
import QuickAction from "../../../../shared/components/QuickAction";
// Giả định bạn đã có các component này (tương tự EmployeeTable/Filter)
import OrderTable from "../../components/layouts/OrderTable"; 
import OrderFilter from "../../components/layouts/OrderFilter"; 

// Services & Utils
import { dashboardService } from "../../services/dashboard.service";
import { orderService } from "../../services/order.service";
import { useAuthStore } from "../../../../auth/auth.store";
// Giả định file permission tương tự HRM
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";
import { useToast } from "../../../../shared/components/ToastProvider";

// Import CSS chung
import "../../../../shared/styles/dashboard.css";

/* =====================
 * Sub-Components (Biểu đồ CSS thuần)
 * ===================== */

// 1. Biểu đồ trạng thái đơn hàng (Thay thế AttendanceChart)
const OrderStatusChart = ({ data, totalOrders }) => {
  if (!data) return <div className="text-muted text-center py-3">Đang tải...</div>;
  
  // data expected: array of { name: 'PENDING', value: 10 }
  // Map màu sắc cho trạng thái
  const getColor = (status) => {
    switch(status) {
        case 'COMPLETED': return 'bg-success';
        case 'SHIPPING': return 'bg-info';
        case 'PENDING': return 'bg-warning';
        case 'CANCELLED': return 'bg-danger';
        default: return 'bg-secondary';
    }
  };

  const getName = (status) => {
      const map = { 'COMPLETED': 'Hoàn thành', 'SHIPPING': 'Đang giao', 'PENDING': 'Chờ xử lý', 'CANCELLED': 'Đã hủy' };
      return map[status] || status;
  };

  return (
    <div className="chart-container">
      <div className="d-flex justify-content-between mb-2">
        <strong>Tổng đơn: {totalOrders}</strong>
        <small className="text-muted">{new Date().toLocaleDateString('vi-VN')}</small>
      </div>

      {data.map((item, index) => {
        const percent = totalOrders > 0 ? (item.value / totalOrders) * 100 : 0;
        if (percent === 0) return null; // Ẩn nếu 0%

        return (
            <div className="chart-row" key={index}>
                <div className="chart-label d-flex align-items-center" style={{minWidth: '100px'}}>
                <span style={{width: 10, height: 10, padding: 0}}> </span>
                {getName(item.name)} ({item.value})
                </div>
                <div className="chart-bar-area">
                <div className={`chart-bar-fill ${getColor(item.name)}`} style={{ width: `${percent}%` }}></div>
                </div>
                <div className="chart-value">{percent.toFixed(1)}%</div>
            </div>
        );
      })}
    </div>
  );
};

// 2. Biểu đồ Top Voucher (Thay thế DepartmentRatioList)
const TopVoucherList = ({ data }) => (
  <div className="ratio-container">
    {(!data || data.length === 0) && <div className="text-muted text-center py-3">Chưa có dữ liệu Voucher</div>}
    {data.map((item, index) => {
      // Giả sử item có usage_count. Nếu không có max, lấy item đầu tiên làm mốc 100%
      const maxVal = data[0]?.usage_count || 1; 
      const percent = maxVal > 0 ? ((item.usage_count / maxVal) * 100) : 0;
      
      return (
        <div key={index} className="ratio-item">
          <div className="ratio-header">
            <span className="ratio-name">{item.code}</span>
            <span className="ratio-percent text-primary">{item.usage_count} lượt</span>
          </div>
          <div className="progress-bg">
             <div className="progress-fill bg-warning" style={{ width: `${percent}%` }}></div>
          </div>
          <div className="ratio-detail text-muted">
            {item.discount_type === 'PERCENTAGE' ? `Giảm ${item.discount_value}%` : `Giảm ${new Intl.NumberFormat('vi-VN').format(item.discount_value)}đ`}
          </div>
        </div>
      );
    })}
  </div>
);

/* =====================
 * Main Component
 * ===================== */
export default function SalesDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  // --- PERMISSIONS ---
  // Giả định quyền Sales tương tự HRM
  const canCreateOrder = hasPermission(user?.role, HRM_PERMISSIONS?.SALES_ORDER_CREATE || "SALES_ORDER_CREATE");
  const canViewReports = hasPermission(user?.role, HRM_PERMISSIONS?.SALES_REPORT_VIEW || "SALES_REPORT_VIEW");
  
  // --- STATE ---
  // State tổng hợp từ dashboard.service
  const [summary, setSummary] = useState(null);
  
  // State cho bảng đơn hàng (Table & Filter)
  const [orders, setOrders] = useState([]);
  const [keyword, setKeyword] = useState(""); // Tìm theo mã đơn hoặc khách hàng
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 5;

  // --- FETCH DATA ---
  const loadDashboard = useCallback(async () => {
    try {
      // Gọi song song: 1. Tổng hợp Dashboard, 2. List Đơn hàng gần nhất
      const [summaryData, ordersData] = await Promise.all([
        dashboardService.getSummary(),
        orderService.getAll({ limit: 100 }) // Lấy 100 đơn mới nhất để hiển thị list
      ]);

      setSummary(summaryData);
      setOrders(ordersData || []);

    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải dữ liệu: " + err.message);
    }
  }, [toast]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // --- FILTER LOGIC (Client-side cho list orders lấy về) ---
  const filteredOrders = useMemo(() => {
    const kw = keyword.toLowerCase().trim();
    return orders.filter(o => {
      const matchKw = !kw || (
        (o.code || "").toLowerCase().includes(kw) || 
        (o.customer_name || "").toLowerCase().includes(kw) // Giả định BE trả về customer_name
      );
      const matchStatus = !status || o.order_status === status;
      return matchKw && matchStatus;
    });
  }, [orders, keyword, status]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedData = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  // --- HANDLERS ---
  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      toast.info("Đang tạo báo cáo, vui lòng đợi...");

      // 1. Lấy dữ liệu đầy đủ từ service (getExportData gọi lại getAll không limit)
      const { summary, orders, customers } = await dashboardService.getExportData();

      // 2. Tạo Workbook
      const wb = XLSX.utils.book_new();

      // --- SHEET 1: TỔNG QUAN ---
      const summarySheetData = [
        ["BÁO CÁO TỔNG QUAN BÁN HÀNG"],
        ["Ngày xuất báo cáo", new Date().toLocaleDateString('vi-VN')],
        [""],
        ["DOANH THU & ĐƠN HÀNG (Tháng hiện tại)"],
        ["Tổng doanh thu", summary.revenueStats.totalRevenue],
        ["Tổng đơn hàng", summary.revenueStats.totalOrders],
        ["Giá trị TB đơn", summary.revenueStats.avgOrderValue],
        ["Đơn chờ xử lý", summary.revenueStats.pendingOrders],
        [""],
        ["KHÁCH HÀNG & KHUYẾN MÃI"],
        ["Khách hàng mới", summary.customerStats.newCustomers],
        ["Tăng trưởng KH", `${summary.customerStats.growthRate}%`],
        ["Voucher đang chạy", summary.voucherStats.activeCount]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng quan");

      // --- SHEET 2: DANH SÁCH ĐƠN HÀNG ---
      const orderData = orders.map(o => ({
        "Mã Đơn": o.code,
        "Khách hàng": o.customer_name || "Khách lẻ",
        "Ngày đặt": o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : "",
        "Tổng tiền": o.total_amount,
        "Phương thức TT": o.payment_method,
        "Trạng thái": o.order_status
      }));
      const wsOrders = XLSX.utils.json_to_sheet(orderData);
      XLSX.utils.book_append_sheet(wb, wsOrders, "Chi tiết đơn hàng");

      // --- SHEET 3: TOP KHÁCH HÀNG (Ví dụ thêm) ---
      // Nếu có data customers
      if (customers && customers.length > 0) {
          const custData = customers.map(c => ({
              "Mã KH": c.code,
              "Tên KH": c.full_name,
              "SĐT": c.phone,
              "Địa chỉ": c.address
          }));
          const wsCust = XLSX.utils.json_to_sheet(custData);
          XLSX.utils.book_append_sheet(wb, wsCust, "Danh sách khách hàng");
      }

      // 3. Xuất file
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const dataBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
      
      saveAs(dataBlob, `Bao_Cao_Doanh_Thu_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    return <div className="p-4 text-center">Đang tải dữ liệu tổng quan...</div>;
  }

  // Destructure dữ liệu
  const { revenueStats, customerStats, voucherStats, charts, widgets } = summary;

  return (
    <div className="dashboard-wrap">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">Dashboard Bán Hàng</h1>
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
          title="Doanh thu tháng" 
          value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueStats?.totalRevenue || 0)} 
          icon={<FaMoneyBillWave className="text-success" />} 
          subText={`${revenueStats?.totalOrders || 0} đơn hàng`}
        />
        
        <StatCard 
          title="Khách hàng mới" 
          value={customerStats?.newCustomers || 0} 
          icon={<FaUserPlus className="text-info"/>} 
          subText={`Tăng trưởng: ${customerStats?.growthRate || 0}%`}
        />
        
        <StatCard 
          title="Đơn hàng chờ xử lý" 
          value={revenueStats?.pendingOrders || 0} 
          icon={<FaShoppingCart className="text-warning"/>} 
          subText="Cần xử lý ngay"
        />

        <StatCard 
          title="Voucher hiệu lực" 
          value={voucherStats?.activeCount || 0} 
          icon={<FaTicketAlt className="text-primary"/>}
          subText="Chương trình khuyến mãi"
        />
      </div>

      {/* 2. CHARTS SECTION */}
      <div className="dashboard-grid mt-4">
        {/* Chart 1: Tình trạng đơn hàng */}
        <div className="dashboard-card">
          <div className="card-header">
            <FaChartPie className="me-2 text-primary" />
            <span>Tình trạng đơn hàng (Tháng này)</span>
          </div>
          <div className="card-body">
            <OrderStatusChart 
                data={charts?.orderStatusData} 
                totalOrders={revenueStats?.totalOrders} 
            />
          </div>
        </div>

        {/* Chart 2: Top Voucher */}
        <div className="dashboard-card">
          <div className="card-header">
            <FaChartBar className="me-2 text-warning" />
            <span>Top Voucher sử dụng nhiều</span>
          </div>
          <div className="card-body">
            <TopVoucherList data={voucherStats?.topVouchers} />
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS */}
      <h3 className="section-title mt-4">Thao tác nhanh</h3>
      <div className="actions">
        <QuickAction 
            label="Tạo đơn hàng" 
            icon={<FaShoppingCart />} 
            onClick={() => navigate("/sales/don-hang/them-moi")} 
            disabled={!canCreateOrder}
        />
        <QuickAction 
            label="Thêm khách hàng" 
            icon={<FaUserPlus />} 
            onClick={() => navigate("/sales/khach-hang/them-moi")}
        />
        <QuickAction 
            label="Quản lý Đơn hàng" 
            icon={<FaClipboardList />} 
            onClick={() => navigate("/sales/don-hang")}
            badge={revenueStats?.pendingOrders} // Badge đỏ số đơn chờ
        />
        <QuickAction 
            label="Chương trình KM" 
            icon={<FaTicketAlt />} 
            onClick={() => navigate("/sales/ma-giam-gia")} 
        />
        <QuickAction 
            label="Danh sách KH" 
            icon={<FaUsers />} 
            onClick={() => navigate("/sales/khach-hang")} 
        />
        {canViewReports && (
            <QuickAction 
              label="Báo cáo chi tiết" 
              icon={<FaFileInvoiceDollar />} 
              onClick={() => navigate("/sales/bao-cao")} 
            />
        )}
      </div>

      {/* 4. ORDER TABLE */}
      <h3 className="section-title mt-4">Đơn hàng gần đây</h3>
      <div className="mb-3">
        {/* OrderFilter: Cần tạo component này tương tự EmployeeFilter */}
        <OrderFilter 
          keyword={keyword} 
          status={status}
          onKeywordChange={(v) => {setKeyword(v); setPage(1)}}
          onStatusChange={(v) => {setStatus(v); setPage(1)}}
          onClear={() => {setKeyword(""); setStatus(""); setPage(1)}}
        />
      </div>
      
      {/* OrderTable: Cần tạo component này tương tự EmployeeTable */}
      <OrderTable
        data={paginatedData} 
        page={page} 
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p-1))} 
        onNext={() => setPage(p => Math.min(totalPages, p+1))}
        onView={(o) => navigate(`/sales/don-hang/${o.id}`)} // id hoặc code tùy schema
        // Sales dashboard thường không cho sửa/xóa trực tiếp như HRM, có thể bỏ onEdit/onDelete hoặc dẫn vào trang chi tiết
      />
    </div>
  );
}