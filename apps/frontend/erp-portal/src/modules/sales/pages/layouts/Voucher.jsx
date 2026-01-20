// apps/frontend/erp-portal/src/modules/sales/pages/layouts/Voucher.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaPlus } from "react-icons/fa"; 
import VoucherTable from "../../components/layouts/VoucherTable";
import VoucherFilter from "../../components/layouts/VoucherFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { voucherService } from "../../services/voucher.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

// Định nghĩa các Option cho bộ lọc tại đây hoặc tách ra file constants
const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động (Active)" },
  { value: "INACTIVE", label: "Ngừng hoạt động (Inactive)" },
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: "FIXED_AMOUNT", label: "Số tiền cố định" },
  { value: "PERCENTAGE", label: "Theo phần trăm (%)" },
];

export default function Voucher() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Tải toàn bộ dữ liệu Voucher (đã bao gồm details và constraints nhờ service)
  const { data: vouchers, loading, refresh } = useAsyncData(voucherService.getAll);

  // 2. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [discountType, setDiscountType] = useState(""); // Thêm state loại giảm giá

  // 3. Logic lọc dữ liệu (Client-side filtering)
  const filteredVouchers = useMemo(() => {
    const kw = keyword.trim().toUpperCase(); // Code thường viết hoa
    
    return (vouchers || []).filter((item) => {
      // Lấy mã code từ details để tìm kiếm
      // Lưu ý: item.voucher_details là mảng, lấy phần tử đầu tiên
      const code = item.voucher_details?.[0]?.code || "";
      
      // Lọc theo từ khóa (Chủ yếu là Mã Code)
      const matchKeyword = !kw || code.includes(kw);

      // Lọc theo Trạng thái
      const matchStatus = !status || item.status === status;

      // Lọc theo Loại giảm giá
      const matchType = !discountType || item.discount_type === discountType;

      return matchKeyword && matchStatus && matchType;
    });
  }, [vouchers, keyword, status, discountType]);

  // 4. Phân trang client-side
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredVouchers, 10); // Hiển thị 10 dòng mỗi trang

  // 5. Xử lý xóa (Soft delete)
  const handleDelete = async (item) => {
    // Lấy mã code hiển thị cho user dễ nhận biết
    const codeDisplay = item.voucher_details?.[0]?.code || `ID: ${item.id}`;
    
    if (!window.confirm(`Bạn có chắc muốn xóa mã giảm giá "${codeDisplay}"?`)) return;

    try {
      await voucherService.remove(item.id);
      toast.error(`Đã xoá mã giảm giá "${codeDisplay}"`);
      refresh(); // Tải lại dữ liệu
    } catch (err) {
      toast.error(err?.message || "Không thể xoá mã giảm giá");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setStatus("");
    setDiscountType("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý mã giảm giá"
        createLabel="Tạo Voucher"
        createIcon={<FaPlus />}
        // Cập nhật đường dẫn theo module sales/voucher
        onCreate={() => navigate("/sales/ma-giam-gia/them-moi")}
        onRestore={() => navigate("/sales/ma-giam-gia/khoi-phuc")}
      />

      <VoucherFilter
        keyword={keyword}
        status={status}
        discountType={discountType}
        
        statusOptions={STATUS_OPTIONS}
        discountTypeOptions={DISCOUNT_TYPE_OPTIONS}
        
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
        onDiscountTypeChange={setDiscountType}
        onClear={handleClearFilter}
      />

      <VoucherTable
        data={paginatedData}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Điều hướng
        onRowClick={(item) => navigate(`/sales/ma-giam-gia/${item.id}`)}
        onView={(item) => navigate(`/sales/ma-giam-gia/${item.id}`)}
        onEdit={(item) => navigate(`/sales/ma-giam-gia/${item.id}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}