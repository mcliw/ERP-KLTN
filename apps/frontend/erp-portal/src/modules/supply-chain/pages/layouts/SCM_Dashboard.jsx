import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  FaBoxOpen, FaTruck, FaShoppingCart, FaWarehouse, 
  FaChartPie, FaChartBar, FaFileInvoiceDollar, 
  FaPlus, FaFileDownload
} from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import StatCard from "../../../../shared/components/StatCard";
import QuickAction from "../../../../shared/components/QuickAction";
import ProductTable from "../../components/layouts/ProductTable";
import ProductFilter from "../../components/layouts/ProductFilter";
import { dashboardService } from "../../services/dashboard.service"
import { productService } from "../../services/product.service";
import { productCategoryService } from "../../services/productCategory.service";
import { useToast } from "../../../../shared/components/ToastProvider";

// Styles
import "../../../../shared/styles/dashboard.css";

/* =====================
 * Sub-Components (Biểu đồ - Giữ nguyên logic cũ)
 * ===================== */
const POStatusChart = ({ data, totalSpend }) => {
    if (!data || data.length === 0) return <div className="text-muted text-center py-3">Chưa có dữ liệu đơn hàng</div>;
    const totalPOs = data.reduce((sum, item) => sum + item.count, 0);
    const getPercent = (val) => totalPOs > 0 ? (val / totalPOs) * 100 : 0;
    const getStatusColor = (status) => {
      switch(status) {
        case 'APPROVED': return 'bg-success';
        case 'COMPLETED': return 'bg-primary';
        case 'PENDING': return 'bg-warning';
        case 'CANCELLED': case 'REJECTED': return 'bg-danger';
        default: return 'bg-secondary';
      }
    };
    return (
      <div className="chart-container">
        <div className="d-flex justify-content-between mb-2">
          <strong>Tổng đơn: {totalPOs}</strong>
          <small className="text-success fw-bold" style={{marginLeft: 90}}>
              Chi tiêu: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalSpend)}
          </small>
        </div>
        {data.map((item, index) => (
          <div className="chart-row" key={index}>
            <div className="chart-label d-flex align-items-center" style={{display: 'block'}}>
              <span style={{width: 10, height: 10, padding: 0}}> </span>
              {item.name} ({item.count})
            </div>
            <div className="chart-bar-area">
              <div className={`chart-bar-fill ${getStatusColor(item.name)}`} style={{ width: `${getPercent(item.count)}%` }}></div>
            </div>
            <div className="chart-value">{getPercent(item.count).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    );
};

const CategoryDistributionList = ({ data, totalProducts }) => {
    if (!data || data.length === 0) return <div className="text-muted text-center py-3">Chưa có dữ liệu danh mục</div>;
    return (
        <div className="ratio-container">
            {data.map((item, index) => {
            const percent = totalProducts > 0 ? ((item.value / totalProducts) * 100).toFixed(1) : 0;
            return (
                <div key={index} className="ratio-item">
                <div className="ratio-header">
                    <span className="ratio-name">{item.name}</span>
                    <span className="ratio-percent">{percent}%</span>
                </div>
                <div className="progress-bg">
                    <div className="progress-fill bg-info" style={{ width: `${percent}%` }}></div>
                </div>
                <div className="ratio-detail text-muted">{item.value} sản phẩm</div>
                </div>
            );
            })}
        </div>
    );
};

/* =====================
 * Main Component
 * ===================== */
export default function SCMDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  
  // State Data
  const [stats, setStats] = useState(null);
  const [poAnalytics, setPoAnalytics] = useState({ chartData: [], totalSpend: 0 });
  const [productDist, setProductDist] = useState([]);
  
  // Table Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); 
  
  // Filter State
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState(""); // Thêm state Phân loại
  const [status, setStatus] = useState(""); // Thêm state Trạng thái
  
  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [isExporting, setIsExporting] = useState(false);

  // --- FETCH DATA ---
  const loadDashboard = useCallback(async () => {
    try {
      const [overviewData, distData, analyticsData, productList, categoryList] = await Promise.all([
        dashboardService.getOverviewStats(),
        dashboardService.getProductDistribution(),
        dashboardService.getPOAnalytics(),
        productService.getAll({ includeDeleted: false }),
        productCategoryService.getAll({ includeDeleted: false })
      ]);

      setStats(overviewData);
      setProductDist(distData);
      setPoAnalytics(analyticsData);
      setProducts(productList || []);
      setCategories(categoryList || []);

    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải dữ liệu Supply Chain: " + err.message);
    }
  }, [toast]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // --- HELPERS ---
  // Tạo categoryMap { id: name } để truyền vào ProductTable
  const categoryMap = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {});
  }, [categories]);

  // --- FILTER LOGIC ---
  const filteredProducts = useMemo(() => {
    const kw = keyword.toLowerCase().trim();
    return products.filter(p => {
      const matchKw = !kw || (
        (p.name || "").toLowerCase().includes(kw) || 
        (p.code || "").toLowerCase().includes(kw)
      );
      const matchCat = !categoryId || String(p.categoryId) === String(categoryId);
      
      // Logic lọc mới cho Type và Status
      const matchType = !type || p.type === type;
      const matchStatus = !status || p.status === status;

      return matchKw && matchCat && matchType && matchStatus;
    });
  }, [products, keyword, categoryId, type, status]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedData = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  // --- HANDLERS ---
  const handleDeleteProduct = async (id) => {
    if (!window.confirm(`Bạn có chắc muốn xóa sản phẩm này?`)) return;
    try {
      await productService.remove(id);
      toast.success("Đã xóa sản phẩm thành công");
      loadDashboard(); 
    } catch (e) { 
      toast.error(e.message || "Lỗi xóa sản phẩm"); 
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setCategoryId("");
    setType("");
    setStatus("");
    setPage(1);
  };

  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      toast.info("Đang tạo báo cáo...");
      const wb = XLSX.utils.book_new();

      // Sheet 1: Tổng quan
      const summarySheetData = [
        ["BÁO CÁO TỔNG QUAN SUPPLY CHAIN"],
        ["Ngày xuất", new Date().toLocaleDateString('vi-VN')],
        [""],
        ["THỐNG KÊ CHUNG"],
        ["Tổng sản phẩm", stats?.totalProducts || 0],
        ["Nhà cung cấp active", stats?.activeSuppliers || 0],
        ["PR Chờ xử lý", stats?.pendingPRs || 0],
        ["PO Chờ duyệt", stats?.pendingPOs || 0],
        [""],
        ["TÀI CHÍNH"],
        ["Tổng chi tiêu", poAnalytics.totalSpend]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Dashboard");

      // Sheet 2: Danh sách SP
      const productSheetData = products.map(p => ({
        "Mã SKU": p.code,
        "Tên SP": p.name,
        "Danh mục": categoryMap[p.categoryId] || "N/A",
        "Thương hiệu": p.brand,
        "Loại": p.type,
        "Giá": p.price,
        "Trạng thái": p.status
      }));
      const wsProducts = XLSX.utils.json_to_sheet(productSheetData);
      XLSX.utils.book_append_sheet(wb, wsProducts, "Danh sách sản phẩm");

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const dataBlob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
      saveAs(dataBlob, `SCM_Report.xlsx`);
      toast.success("Xuất báo cáo thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi xuất báo cáo");
    } finally {
      setIsExporting(false);
    }
  };

  // --- RENDER ---
  if (!stats) return <div className="p-4 text-center">Đang tải dữ liệu Supply Chain...</div>;

  return (
    <div className="dashboard-wrap">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-1">Dashboard Chuỗi Cung Ứng</h1>
        <button className="btn-restore" onClick={handleExportReport} disabled={isExporting}>
          {isExporting ? <span className="spinner-border spinner-border-sm me-2"/> : <FaFileDownload className="me-2" />}
          <span>Xuất báo cáo</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats">
        <StatCard title="Tổng sản phẩm" value={stats.totalProducts} icon={<FaBoxOpen />} subText="Trong hệ thống"/>
        <StatCard title="Nhà cung cấp" value={stats.activeSuppliers} icon={<FaTruck className="text-info"/>} subText="Đang hợp tác"/>
        <StatCard title="Yêu cầu mua (PR)" value={stats.pendingPRs} icon={<FaShoppingCart className="text-warning" />} subText="Đang chờ xử lý"/>
        <StatCard title="Đơn mua hàng (PO)" value={stats.pendingPOs} icon={<FaFileInvoiceDollar className="text-primary"/>} subText="Chờ phê duyệt"/>
      </div>

      {/* Charts */}
      <div className="dashboard-grid mt-4">
        <div className="dashboard-card">
          <div className="card-header">
            <FaChartBar className="me-2 text-primary" />
            <span>Thống kê Đơn mua hàng (PO)</span>
          </div>
          <div className="card-body">
            <POStatusChart data={poAnalytics.chartData} totalSpend={poAnalytics.totalSpend} />
          </div>
        </div>
        <div className="dashboard-card">
          <div className="card-header">
            <FaChartPie className="me-2 text-success" />
            <span>Phân bổ sản phẩm theo danh mục</span>
          </div>
          <div className="card-body">
            <CategoryDistributionList data={productDist} totalProducts={stats.totalProducts} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h3 className="section-title mt-4">Thao tác nhanh</h3>
      <div className="actions">
        <QuickAction label="Thêm sản phẩm" icon={<FaPlus />} onClick={() => navigate("/supply-chain/san-pham-tai-san/them-moi")} />
        <QuickAction label="Tạo Yêu cầu (PR)" icon={<FaShoppingCart />} onClick={() => navigate("/supply-chain/yeu-cau-mua-hang/them-moi")} />
        <QuickAction label="Duyệt Đơn hàng" icon={<FaFileInvoiceDollar />} onClick={() => navigate("/supply-chain/don-mua-hang")} badge={stats.pendingPOs} />
        <QuickAction label="Quản lý Kho" icon={<FaWarehouse />} onClick={() => navigate("/supply-chain/kho-hang")} />
      </div>

      {/* --- DANH SÁCH SẢN PHẨM --- */}
      <h3 className="section-title mt-4">Danh sách sản phẩm</h3>
      
      {/* 1. Component Filter mới */}
      <ProductFilter 
        keyword={keyword}
        categoryId={categoryId}
        type={type}
        status={status}
        categoryOptions={categories.map(c => ({ value: c.id, label: c.name }))} // Map data cho Select
        onKeywordChange={(val) => { setKeyword(val); setPage(1); }}
        onCategoryChange={(val) => { setCategoryId(val); setPage(1); }}
        onTypeChange={(val) => { setType(val); setPage(1); }}
        onStatusChange={(val) => { setStatus(val); setPage(1); }}
        onClear={handleClearFilter}
      />

      {/* 2. Component Table mới */}
      <ProductTable 
        data={paginatedData}
        categoryMap={categoryMap} // Map ID -> Name
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
        onView={(item) => navigate(`/supply-chain/san-pham-tai-san/${item.id}`)}
        onEdit={(item) => navigate(`/supply-chain/san-pham-tai-san/${item.id}/chinh-sua`)}
        onDelete={(item) => handleDeleteProduct(item.id)}
      />
    </div>
  );
}