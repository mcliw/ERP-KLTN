// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/Supplier.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaPlus } from "react-icons/fa"; // Đổi icon cho phù hợp chung
import SupplierTable from "../../components/layouts/SupplierTable";
import SupplierFilter from "../../components/layouts/SupplierFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { supplierService } from "../../services/supplier.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";
import { useToast } from "../../../../shared/components/ToastProvider";

export default function SupplierDocument() {
  const navigate = useNavigate();
  // Không cần useLookupMaps vì Supplier không phụ thuộc Department/Position

  const { data: suppliers, loading, refresh } = useAsyncData(supplierService.getAll);

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState("");
  const toast = useToast();

  // Định nghĩa các options cho Filter
  const statusOptions = [
    { value: "Đang hợp tác", label: "Đang hợp tác" },
    { value: "Dừng hợp tác", label: "Dừng hợp tác" },
  ];

  const ratingOptions = [
    { value: "5", label: "Xuất sắc (5.0)" },
    { value: "4", label: "Tốt (>= 4.0)" },
    { value: "3", label: "Trung bình (>= 3.0)" },
    { value: "0", label: "Chưa có đánh giá" },
  ];

  const filteredSuppliers = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    
    return suppliers.filter((s) => {
      // 1. Filter Keyword: Tên, Mã, MST, Email
      const matchKeyword =
        !kw ||
        s.name?.toLowerCase().includes(kw) ||
        s.code?.toLowerCase().includes(kw) ||
        s.taxCode?.includes(kw) || // MST thường là số nên không cần lowercase, nhưng để chắc chắn
        s.contactEmail?.toLowerCase().includes(kw);

      // 2. Filter Status
      const matchStatus = !status || s.status === status;

      // 3. Filter Rating (Logic: Lớn hơn hoặc bằng mức chọn)
      let matchRating = true;
      if (rating) {
        const itemRating = s.rating || 0;
        if (rating === "0") {
            matchRating = itemRating === 0;
        } else {
            matchRating = itemRating >= Number(rating);
        }
      }

      return matchKeyword && matchStatus && matchRating;
    });
  }, [suppliers, keyword, status, rating]);

  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredSuppliers, 7);

  const handleDelete = async (item) => {
    if (!window.confirm(`Xoá nhà cung cấp "${item.name}"?`)) return;

    try {
      await supplierService.remove(item.code);
      toast.error(`Đã xoá nhà cung cấp "${item.name}"`);
      refresh();
    } catch (err) {
      toast.error(err?.message || "Không thể xoá nhà cung cấp");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setStatus("");
    setRating("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu nhà cung cấp...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý Nhà cung cấp"
        createLabel="Thêm mới"
        createIcon={<FaPlus />}
        onCreate={() => navigate("/supply-chain/nha-cung-cap/them-moi")}
        onRestore={() => navigate("/supply-chain/nha-cung-cap/khoi-phuc")}
      />

      <SupplierFilter
        keyword={keyword}
        status={status}
        rating={rating}
        statusOptions={statusOptions}
        ratingOptions={ratingOptions}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
        onRatingChange={setRating}
        onClear={handleClearFilter}
      />

      <SupplierTable
        data={paginatedData}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        onRowClick={(s) => navigate(`/supply-chain/nha-cung-cap/${s.code}`)}
        onView={(s) => navigate(`/supply-chain/nha-cung-cap/${s.code}`)}
        onEdit={(s) => navigate(`/supply-chain/nha-cung-cap/${s.code}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}