// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/Quotation.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { FaPlus } from "react-icons/fa";

// Components & Services
import QuotationTable from "../../components/layouts/QuotationTable";
import QuotationFilter from "../../components/layouts/QuotationFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { quotationService } from "../../services/quotation.service";
import { purchaseRequestService } from "../../services/purchaseRequest.service"; // Cần để lấy PR Code

// Hooks & Utils
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
];

export default function Quotation() {
  const navigate = useNavigate();
  const toast = useToast();

  // --- 1. LOAD DATA TỪ SERVICE ---
  const loadData = useCallback(async () => {
    // Gọi song song 3 API: Lấy list Báo giá, list NCC, list PR
    const [quotes, suppliers, prs] = await Promise.all([
      quotationService.getAll(),            // Port 3002
      quotationService.getSuppliersRef(),   // Port 3002 (Giả định)
      purchaseRequestService.getAll()       // Port 3002 (Lấy PR để map code)
    ]);
    
    return { quotes, suppliers, prs };
  }, []);

  const { data, loading, refresh } = useAsyncData(loadData);

  // Destructure an toàn
  const quotations = data?.quotes || [];
  const suppliers = data?.suppliers || [];
  const prList = data?.prs || [];

  // --- 2. XỬ LÝ MAP DỮ LIỆU & FILTER ---
  
  const [keyword, setKeyword] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("");

  const { supplierMap, prMap, supplierOptions } = useMemo(() => {
    const sMap = {};
    const pMap = {};
    const sOptions = [];

    // Map Supplier ID -> Name
    suppliers.forEach(s => {
      sMap[String(s.id)] = s.name;
      sOptions.push({ value: s.id, label: s.name });
    });
    
    // Map PR ID -> PR Code (Để hiển thị trên bảng)
    prList.forEach(p => {
        pMap[String(p.id)] = p.pr_code;
    });

    return { supplierMap: sMap, prMap: pMap, supplierOptions: sOptions };
  }, [suppliers, prList]);

  const filteredData = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return quotations.filter((item) => {
      // Tìm theo RFQ Code hoặc PR Code (thông qua map)
      const prCode = prMap[String(item.pr_id)] || "";
      const matchKeyword = !kw 
        || item.rfq_code?.toLowerCase().includes(kw) 
        || prCode.toLowerCase().includes(kw);

      const matchSupplier = !supplierId || String(item.supplier_id) === String(supplierId);
      const matchStatus = !status || item.status === status;

      return matchKeyword && matchSupplier && matchStatus;
    });
  }, [quotations, keyword, supplierId, status, prMap]);

  const { paginatedData, page, totalPages, goToPrev, goToNext } = useClientPagination(filteredData, 10);

  // --- 3. ACTIONS HANDLERS ---

  const handleDelete = async (item) => {
    // Validation: Không xóa nếu đã duyệt hoặc đã được chọn
    if (item.status === "APPROVED" || item.is_selected) {
        toast.error("Không thể xóa báo giá đã được duyệt hoặc đã được chọn mua.");
        return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa báo giá "${item.rfq_code}"?`)) return;
    
    try {
      await quotationService.remove(item.id);
      toast.success(`Đã xoá báo giá "${item.rfq_code}" thành công`);
      refresh();
    } catch (err) {
      toast.error(err?.message || "Không thể xoá báo giá");
    }
  };

  const handleEdit = (item) => {
    // Validation: Không sửa nếu đã duyệt hoặc đã được chọn
    if (item.status === "APPROVED" || item.status === "REJECTED" || item.is_selected) {
      toast.error("Không thể chỉnh sửa báo giá này do đã được duyệt/chọn.");
      return;
    }
    navigate(`/supply-chain/bao-gia/${item.id}/chinh-sua`);
  };

  const handleClearFilter = () => {
    setKeyword("");
    setSupplierId("");
    setStatus("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý Báo giá nhà cung cấp"
        createLabel="Tạo báo giá"
        createIcon={<FaPlus />}
        onCreate={() => navigate("/supply-chain/bao-gia/them-moi")}
        onRestore={() => navigate("/supply-chain/bao-gia/khoi-phuc")}
      />

      <QuotationFilter
        keyword={keyword}
        supplierId={supplierId}
        status={status}
        supplierOptions={supplierOptions}
        statusOptions={STATUS_OPTIONS}
        onKeywordChange={setKeyword}
        onSupplierChange={setSupplierId}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <QuotationTable
        data={paginatedData}
        supplierMap={supplierMap}
        prMap={prMap}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        onRowClick={(item) => navigate(`/supply-chain/bao-gia/${item.id}`)}
        onView={(item) => navigate(`/supply-chain/bao-gia/${item.id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}