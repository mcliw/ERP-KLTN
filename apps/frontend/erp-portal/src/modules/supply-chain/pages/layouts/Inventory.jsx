// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/Inventory.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { FaPlus } from "react-icons/fa";

// Components
import InventoryTable from "../../components/layouts/InventoryTable";
import InventoryFilter from "../../components/layouts/InventoryFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { warehouseService } from "../../services/warehouse.service";
import { binService } from "../../services/bin.service";
import { productService } from "../../services/product.service";

// Services
import { inventoryService } from "../../services/inventory.service";

// Hooks & Utils
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

// Config Options cho Filter
const STOCK_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Có hàng sẵn (Available > 0)" },
  { value: "OUT_OF_STOCK", label: "Hết hàng (Available = 0)" },
  { value: "ALLOCATED", label: "Đang giữ hàng (Allocated > 0)" },
  { value: "LOW_STOCK", label: "Cảnh báo tồn thấp (< 10)" },
];

export default function Inventory() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Hàm tải dữ liệu tổng hợp (Stock + Reference Data)
  // Vì Inventory chỉ lưu ID, ta cần fetch thêm warehouses, products, bins để hiển thị tên
  const fetchInventoryData = useCallback(async () => {
    const BASE_URL = "/api/supply-chain";
    
    // Promise.all giữ nguyên
    const [stocks, warehouses, bins, products] = await Promise.all([
      inventoryService.getAll(),
      warehouseService.getAll(),
      binService.getAll(),
      productService.getAll()
    ]);

    return { stocks, warehouses, bins, products };
  }, []);

  // 2. Fetch Data
  const { data, loading, refresh } = useAsyncData(fetchInventoryData);
  
  // Destructure data để dùng cho dễ (Default là mảng rỗng để tránh lỗi render khi loading)
  const { 
    stocks = [], 
    warehouses = [], 
    bins = [], 
    products = [] 
  } = data || {};

  // 3. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [stockStatus, setStockStatus] = useState("");

  // 4. Logic lọc dữ liệu (Client-side filtering)
  const filteredStocks = useMemo(() => {
    const kw = keyword.trim().toLowerCase();

    return stocks.filter((item) => {
      // 4.1 Lookup thông tin tham chiếu
      const product = products.find(p => String(p.id) === String(item.product_id)) || {};
      const bin = bins.find(b => String(b.id) === String(item.bin_id)) || {};

      // 4.2 Lọc theo từ khóa (Tên sản phẩm, Mã SKU, hoặc Mã Bin)
      const matchKeyword =
        !kw ||
        (product.name && product.name.toLowerCase().includes(kw)) ||
        (product.sku && product.sku.toLowerCase().includes(kw)) ||
        (bin.code && bin.code.toLowerCase().includes(kw));

      // 4.3 Lọc theo Kho
      const matchWarehouse = !warehouseId || String(item.warehouse_id) === String(warehouseId);

      // 4.4 Lọc theo Trạng thái tồn kho
      let matchStatus = true;
      if (stockStatus) {
        if (stockStatus === "AVAILABLE") matchStatus = item.quantity_available > 0;
        else if (stockStatus === "OUT_OF_STOCK") matchStatus = item.quantity_available <= 0;
        else if (stockStatus === "ALLOCATED") matchStatus = item.quantity_allocated > 0;
        else if (stockStatus === "LOW_STOCK") matchStatus = item.quantity_available < 10;
      }

      return matchKeyword && matchWarehouse && matchStatus;
    });
  }, [stocks, products, bins, keyword, warehouseId, stockStatus]);

  // 5. Phân trang client-side
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredStocks, 10);

  // 6. Xử lý xóa (Hard Delete - Chỉ cho phép khi tồn = 0)
    const handleDelete = async (item) => {

        // 1. Kiểm tra tồn kho (Logic Client-side)
        // Nếu > 0 thì báo lỗi và dừng lại
        if (item.quantity_on_hand > 0) {
            console.log("Bị chặn do còn tồn kho");
            toast.error(`Không thể xóa! Sản phẩm này vẫn còn ${item.quantity_on_hand} tồn kho.`)
            return;
        }

        // 2. Hộp thoại xác nhận
        // Nếu dòng này không hiện ra -> Nút bấm chưa gọi được hàm này
        const isConfirmed = window.confirm(`Bạn có chắc muốn chuyển dòng ID ${item.id} vào thùng rác?`);
        if (!isConfirmed) return;

        try {
            console.log("Đang gọi API remove...");
            // Gọi API
            await inventoryService.remove(item.id);
            
            console.log("Xóa thành công");
            toast.success("Đã chuyển vào thùng rác");
            refresh(); // Load lại bảng
        } catch (err) {
            console.error("Lỗi API:", err);
            // Hiển thị message từ Service (ví dụ: HAS_STOCK từ server)
            alert("Lỗi: " + (err.message || "Không thể xóa"));
        }
    };

  const handleClearFilter = () => {
    setKeyword("");
    setWarehouseId("");
    setStockStatus("");
  };

  // Prepare Warehouse Options for Filter
  const warehouseOptions = useMemo(() => {
    return warehouses.map(w => ({ value: w.id, label: w.name }));
  }, [warehouses]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu tồn kho...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý tồn kho"
        createLabel="Nhập kho ban đầu"
        createIcon={<FaPlus />}
        // Điều hướng đến trang tạo mới (Initial Stock)
        onCreate={() => navigate("/supply-chain/ton-kho/nhap-moi")}
        onRestore={() => navigate("/supply-chain/ton-kho/khoi-phuc")}
        // Inventory thường không có nút Restore (Thùng rác) như Warehouse
      />

      <InventoryFilter
        keyword={keyword}
        warehouseId={warehouseId}
        stockStatus={stockStatus}
        
        warehouseOptions={warehouseOptions}
        stockStatusOptions={STOCK_STATUS_OPTIONS}
        
        onKeywordChange={setKeyword}
        onWarehouseChange={setWarehouseId}
        onStockStatusChange={setStockStatus}
        onClear={handleClearFilter}
      />

      <InventoryTable
        data={paginatedData}
        // Truyền dữ liệu tham chiếu xuống Table để hiển thị tên
        warehouses={warehouses}
        bins={bins}
        products={products}

        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Actions
        onRowClick={(item) => navigate(`/supply-chain/ton-kho/${item.id}`)}
        onView={(item) => navigate(`/supply-chain/ton-kho/${item.id}`)}
        onEdit={(item) => navigate(`/supply-chain/ton-kho/${item.id}/dieu-chinh`)}
        onDelete={handleDelete}
      />
    </div>
  );
}