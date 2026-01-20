// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/Warehouse.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaPlus } from "react-icons/fa";
import WarehouseTable from "../../components/layouts/WarehouseTable";
import WarehouseFilter from "../../components/layouts/WarehouseFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { warehouseService, WAREHOUSE_TYPES } from "../../services/warehouse.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

// Các options cho bộ lọc (Có thể tách ra file constants dùng chung)
const WAREHOUSE_TYPE_OPTIONS = [
  { value: "CENTRAL", label: "Kho Trung Tâm" },
  { value: "LOCAL", label: "Kho Địa Phương" },
  { value: "TRANSIT", label: "Kho Trung Chuyển" },
  { value: "BONDED", label: "Kho Ngoại Quan" },
  { value: "RETAIL", label: "Cửa Hàng Bán Lẻ" },
];

const STATUS_OPTIONS = [
  { value: "true", label: "Hoạt động" },
  { value: "false", label: "Ngừng hoạt động" },
];

export default function Warehouse() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Tải toàn bộ dữ liệu kho hàng
  const { data: warehouses, loading, refresh } = useAsyncData(warehouseService.getAll);

  // 2. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState(""); // Thay parentId bằng type
  const [status, setStatus] = useState("");

  // 3. Logic lọc dữ liệu (Client-side filtering)
  const filteredWarehouses = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    
    return (warehouses || []).filter((item) => {
      // Lọc theo từ khóa (Mã, Tên hoặc Địa chỉ)
      const matchKeyword =
        !kw ||
        item.code?.toLowerCase().includes(kw) ||
        item.name?.toLowerCase().includes(kw) ||
        (item.address && item.address.toLowerCase().includes(kw));

      // Lọc theo Loại kho (Warehouse Type)
      const matchType = !type || item.type === type;

      // Lọc theo Trạng thái (is_active là boolean, status là string "true"/"false")
      const matchStatus = !status || String(item.is_active) === status;

      return matchKeyword && matchType && matchStatus;
    });
  }, [warehouses, keyword, type, status]);

  // 4. Phân trang client-side
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredWarehouses, 10); // Hiển thị 10 dòng mỗi trang

  // 5. Xử lý xóa (Soft delete)
  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn xóa kho "${item.name}"?`)) return;

    try {
      await warehouseService.remove(item.id);
      toast.error(`Đã xoá kho "${item.name}"`);
      refresh(); // Tải lại dữ liệu
    } catch (err) {
      toast.error(err?.message || "Không thể xoá kho hàng");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setType("");
    setStatus("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu kho...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý kho bãi"
        createLabel="Tạo kho mới"
        createIcon={<FaPlus />}
        // Điều hướng đến trang tạo mới
        onCreate={() => navigate("/supply-chain/kho-hang/them-moi")}
        // Điều hướng đến trang thùng rác (Restore)
        onRestore={() => navigate("/supply-chain/kho-hang/khoi-phuc")}
      />

      <WarehouseFilter
        keyword={keyword}
        type={type}
        status={status}
        
        typeOptions={WAREHOUSE_TYPE_OPTIONS}
        statusOptions={STATUS_OPTIONS}
        
        onKeywordChange={setKeyword}
        onTypeChange={setType}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <WarehouseTable
        data={paginatedData}
        // Không cần categoryMap vì kho không có quan hệ cha con hiển thị tên
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Các hành động điều hướng
        onRowClick={(item) => navigate(`/supply-chain/kho-hang/${item.id}`)}
        onView={(item) => navigate(`/supply-chain/kho-hang/${item.id}`)}
        onEdit={(item) => navigate(`/supply-chain/kho-hang/${item.id}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}