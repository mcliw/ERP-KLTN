// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/PurchaseOrder.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { FaPlus, FaFileDownload } from "react-icons/fa";

// Components & Services
import PurchaseOrderTable from "../../components/layouts/PurchaseOrderTable";
import PurchaseOrderFilter from "../../components/layouts/PurchaseOrderFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { purchaseOrderService } from "../../services/purchaseOrder.service";
import { quotationService } from "../../services/quotation.service";

// Hooks & Utils
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";

// Styles
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

const PO_STATUS_OPTIONS = [
  { value: "PENDING", label: "Chờ phê duyệt" },
  { value: "APPROVED", label: "Đã phê duyệt" },
  { value: "REJECTED", label: "Đã từ chối" },
  { value: "COMPLETED", label: "Đã hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy bỏ" },
];

export default function PurchaseOrder() {
  const navigate = useNavigate();
  const toast = useToast();

  // --- 1. LOAD DATA TỪ SERVICE ---
  const loadData = useCallback(async () => {
    // Gọi song song: Lấy danh sách PO, Nhà cung cấp và Báo giá để map thông tin
    const [pos, suppliers, quotes] = await Promise.all([
      purchaseOrderService.getAll(),
      quotationService.getSuppliersRef(),
      quotationService.getAll(), // Dùng để lấy rfq_code hiển thị trên bảng
    ]);
    
    return { pos, suppliers, quotes };
  }, []);

  const { data, loading, refresh } = useAsyncData(loadData);

  // Destructure dữ liệu
  const poList = data?.pos || [];
  const suppliers = data?.suppliers || [];
  const quotationList = data?.quotes || [];

  // --- 2. XỬ LÝ MAP DỮ LIỆU & FILTER ---
  const [keyword, setKeyword] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("");

  const { supplierMap, quotationMap, supplierOptions } = useMemo(() => {
    const sMap = {};
    const qMap = {};
    const sOptions = [];

    // Map Supplier ID -> Name
    suppliers.forEach(s => {
      sMap[String(s.id)] = s.name;
      sOptions.push({ value: s.id, label: s.name });
    });
    
    // Map Quotation ID -> RFQ Code
    quotationList.forEach(q => {
      qMap[String(q.id)] = q.rfq_code;
    });

    return { 
      supplierMap: sMap, 
      quotationMap: qMap, 
      supplierOptions: sOptions 
    };
  }, [suppliers, quotationList]);

  // Logic lọc dữ liệu tại Client
  const filteredData = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return poList.filter((item) => {
      // Tìm theo Mã PO hoặc Mã RFQ tham chiếu
      const rfqCode = quotationMap[String(item.quotation_id)] || "";
      const matchKeyword = !kw 
        || item.po_code?.toLowerCase().includes(kw) 
        || rfqCode.toLowerCase().includes(kw);

      const matchSupplier = !supplierId || String(item.supplier_id) === String(supplierId);
      const matchStatus = !status || item.status === status;

      return matchKeyword && matchSupplier && matchStatus;
    });
  }, [poList, keyword, supplierId, status, quotationMap]);

  const { paginatedData, page, totalPages, goToPrev, goToNext } = useClientPagination(filteredData, 10);

  // --- 3. ACTIONS HANDLERS ---

  const handleDelete = async (item) => {
    // Không cho xóa nếu PO đã ở trạng thái cuối (Duyệt/Hoàn thành)
    if (["APPROVED", "COMPLETED", "REJECTED"].includes(item.status)) {
        toast.error("Không thể xóa đơn hàng đã phê duyệt hoặc đã hoàn thành.");
        return;
    }

    if (!window.confirm(`Xác nhận xóa đơn mua hàng "${item.po_code}"?`)) return;
    
    try {
      await purchaseOrderService.remove(item.id);
      toast.success(`Đã xoá đơn hàng "${item.po_code}" thành công`);
      refresh();
    } catch (err) {
      toast.error(err?.message || "Lỗi khi xóa đơn hàng");
    }
  };

  const handleEdit = (item) => {
    if (["APPROVED", "COMPLETED", "REJECTED"].includes(item.status)) {
      toast.error("Đơn hàng đã chốt, không thể chỉnh sửa thông tin.");
      return;
    }
    navigate(`/supply-chain/don-mua-hang/${item.id}/chinh-sua`);
  };

  const handleClearFilter = () => {
    setKeyword("");
    setSupplierId("");
    setStatus("");
  };

  if (loading) return <div className="p-4">Đang tải danh sách đơn hàng...</div>;

  return (
    <div className="main-document">
      {/* Tiêu đề trang và Nút tạo mới */}
      <PageHeader
        title="Quản lý Đơn mua hàng"
        createLabel="Tạo đơn hàng"
        createIcon={<FaPlus />}
        onCreate={() => navigate("/supply-chain/don-mua-hang/them-moi")}
        // Nút phụ để xem lịch sử đã xóa
        onRestore={() => navigate("/supply-chain/don-mua-hang/khoi-phuc")}
      />

      {/* Thanh bộ lọc */}
      <PurchaseOrderFilter
        keyword={keyword}
        supplierId={supplierId}
        status={status}
        supplierOptions={supplierOptions}
        statusOptions={PO_STATUS_OPTIONS}
        onKeywordChange={setKeyword}
        onSupplierChange={setSupplierId}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      {/* Bảng hiển thị dữ liệu */}
      <PurchaseOrderTable
        data={paginatedData}
        supplierMap={supplierMap}
        quotationMap={quotationMap}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        // Xem chi tiết khi click vào dòng
        onRowClick={(item) => navigate(`/supply-chain/don-mua-hang/${item.id}`)}
        onView={(item) => navigate(`/supply-chain/don-mua-hang/${item.id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}