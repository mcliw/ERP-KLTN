// apps/frontend/erp-portal/src/modules/sales/pages/layouts/Receipt.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaPlus } from "react-icons/fa"; 
import ReceiptTable from "../../components/layouts/ReceiptTable";
import ReceiptFilter from "../../components/layouts/ReceiptFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { receiptService } from "../../services/receipt.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

export default function Receipt() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Tải toàn bộ dữ liệu phiếu thu
  // Mặc định service getAll() sẽ lọc bỏ các bản ghi đã xóa mềm
  const { data: receipts, loading, refresh } = useAsyncData(receiptService.getAll);

  // 2. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  // Thay thế status bằng debitAccount để lọc theo loại quỹ (Tiền mặt/Ngân hàng)
  const [debitAccount, setDebitAccount] = useState("");

  // 3. Logic lọc dữ liệu (Client-side filtering)
  const filteredReceipts = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    
    return (receipts || []).filter((item) => {
      // Lọc theo từ khóa (Số phiếu, Mã khách hàng, Mã đơn hàng)
      const matchKeyword =
        !kw ||
        item.id.toLowerCase().includes(kw) ||
        item.customer_id?.toLowerCase().includes(kw) ||
        item.order_reference_id?.toString().toLowerCase().includes(kw) ||
        item.description?.toLowerCase().includes(kw);

      // Lọc theo Tài khoản Nợ (111 hoặc 112)
      const matchAccount = !debitAccount || item.debit_account_code === debitAccount;

      return matchKeyword && matchAccount;
    });
  }, [receipts, keyword, debitAccount]);

  // 4. Phân trang client-side
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredReceipts, 10); // Hiển thị 10 dòng mỗi trang

  // 5. Xử lý xóa (Soft delete)
  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phiếu thu số "${item.id}"?`)) return;

    try {
      await receiptService.remove(item.id);
      toast.error(`Đã xoá phiếu thu "${item.id}"`);
      refresh(); // Tải lại dữ liệu
    } catch (err) {
      toast.error(err?.message || "Không thể xoá phiếu thu");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setDebitAccount("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu phiếu thu...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý phiếu thu"
        createLabel="Lập phiếu thu"
        createIcon={<FaPlus />}
        // Điều hướng đến trang tạo mới
        onCreate={() => navigate("/finance/phieu-thu/them-moi")}
        // Điều hướng đến trang khôi phục (Thùng rác)
        onRestore={() => navigate("/finance/phieu-thu/khoi-phuc")}
      />

      <ReceiptFilter
        keyword={keyword}
        debitAccount={debitAccount}
        
        // Options cho bộ lọc tài khoản
        accountOptions={[
          { value: "111", label: "111 - Tiền mặt" },
          { value: "112", label: "112 - Tiền gửi ngân hàng" },
        ]}
        
        onKeywordChange={setKeyword}
        onAccountChange={setDebitAccount}
        onClear={handleClearFilter}
      />

      <ReceiptTable
        data={paginatedData}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Điều hướng & Thao tác
        onRowClick={(item) => navigate(`/finance/phieu-thu/${item.id}`)}
        onView={(item) => navigate(`/finance/phieu-thu/${item.id}`)}
        onEdit={(item) => navigate(`/finance/phieu-thu/${item.id}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}