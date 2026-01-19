// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/Bin.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaPlus } from "react-icons/fa";
import BinTable from "../../components/layouts/BinTable";
import BinFilter from "../../components/layouts/BinFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { binService } from "../../services/bin.service";
import { warehouseService } from "../../services/warehouse.service"; // Cần service này để lấy danh sách kho
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import { isSoftDeleted } from "../../../../shared/utils/softDelete"; // Import helper
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

// Options cho trạng thái (Dựa trên Soft Delete)
const STATUS_OPTIONS = [
    { value: "true", label: "Hoạt động" },
    { value: "false", label: "Ngừng hoạt động" },
];

export default function Bin() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Tải dữ liệu: Cần cả Bin Locations và List Warehouses (để map tên)
  // Lưu ý: useAsyncData tải bins, warehouses tải riêng hoặc dùng Promise.all nếu cần tối ưu
  const { data: bins, loading: loadingBins, refresh: refreshBins } = useAsyncData(binService.getAll);
  const { data: warehouses, loading: loadingWh } = useAsyncData(warehouseService.getAll);

  // 2. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  const [warehouseId, setWarehouseId] = useState(""); // Lọc theo kho
  const [status, setStatus] = useState(""); // Lọc theo trạng thái xóa

  // Chuẩn bị options cho bộ lọc kho
  const warehouseOptions = useMemo(() => {
    if (!warehouses) return [];
    return warehouses.map(w => ({ value: w.id, label: w.name }));
  }, [warehouses]);

  // 3. Logic lọc dữ liệu (Client-side filtering)
  const filteredBins = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    
    return (bins || []).filter((item) => {

        if (isSoftDeleted(item.deletedAt)) return false;
        // a. Lọc theo từ khóa (Mã vị trí)
        const matchKeyword = !kw || item.code?.toLowerCase().includes(kw);

        // b. Lọc theo Kho hàng
        // So sánh string để tránh lệch kiểu số/chữ
        const matchWarehouse = !warehouseId || String(item.warehouse_id) === String(warehouseId);

        const matchStatus = !status || String(item.is_active) === status;

        return matchKeyword && matchWarehouse && matchStatus;
    });
  }, [bins, keyword, warehouseId, status]);

  // 4. Phân trang client-side
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredBins, 10);

  // 5. Xử lý xóa (Soft delete)
  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn xóa vị trí "${item.code}"?`)) return;

    try {
      await binService.remove(item.id);
      toast.error(`Đã xoá vị trí "${item.code}"`);
      refreshBins(); // Tải lại dữ liệu bin
    } catch (err) {
      toast.error(err?.message || "Không thể xoá vị trí");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setWarehouseId("");
    setStatus("");
  };

  // Hiển thị loading nếu đang tải bins hoặc warehouses
  if (loadingBins || loadingWh) {
      return <div style={{ padding: 20 }}>Đang tải dữ liệu vị trí kho...</div>;
  }

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý vị trí kho (Bins)"
        createLabel="Tạo vị trí mới"
        createIcon={<FaPlus />}
        // Điều hướng đến trang tạo mới
        onCreate={() => navigate("/supply-chain/vi-tri-kho/them-moi")}
        // Điều hướng đến trang thùng rác (Restore) - Nếu có trang riêng
        onRestore={() => navigate("/supply-chain/vi-tri-kho/khoi-phuc")}
      />

      <BinFilter
        keyword={keyword}
        warehouseId={warehouseId}
        status={status}
        
        warehouseOptions={warehouseOptions}
        statusOptions={STATUS_OPTIONS}
        
        onKeywordChange={setKeyword}
        onWarehouseChange={setWarehouseId}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <BinTable
        data={paginatedData}
        warehouses={warehouses} // Truyền list kho vào để table map ID -> Name
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Các hành động điều hướng
        onRowClick={(item) => navigate(`/supply-chain/vi-tri-kho/${item.id}`)}
        onView={(item) => navigate(`/supply-chain/vi-tri-kho/${item.id}`)}
        onEdit={(item) => navigate(`/supply-chain/vi-tri-kho/${item.id}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}