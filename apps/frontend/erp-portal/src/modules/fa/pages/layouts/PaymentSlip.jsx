// apps/frontend/erp-portal/src/modules/finance/pages/layouts/PaymentSlip.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaPlus } from "react-icons/fa"; 
import PaymentSlipTable from "../../components/layouts/PaymentSlipTable";
import PaymentSlipFilter from "../../components/layouts/PaymentSlipFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { paymentSlipService } from "../../services/paymentSlip.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

export default function PaymentSlip() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Tải dữ liệu phiếu chi (Service đã tự động enrich tên NCC và PO)
  const { data: slips, loading, refresh } = useAsyncData(paymentSlipService.getAll);

  // 2. State bộ lọc
  const [keyword, setKeyword] = useState("");
  const [creditAccount, setCreditAccount] = useState(""); // Lọc theo hình thức chi (111/112)

  // 3. Logic lọc dữ liệu (Client-side)
  const filteredSlips = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    
    return (slips || []).filter((item) => {
      // a. Lọc theo từ khóa (Số phiếu, Tên NCC, Mã PO)
      const matchKeyword =
        !kw ||
        item.id.toLowerCase().includes(kw) ||
        item.supplier_name?.toLowerCase().includes(kw) || // Tìm theo tên NCC
        item.description?.toLowerCase().includes(kw) ||
        // Tìm trong mảng các PO tham chiếu
        item.purchase_orders_info?.some(po => po.code?.toLowerCase().includes(kw));

      // b. Lọc theo Tài khoản Có (111 - Tiền mặt / 112 - Ngân hàng)
      const matchAccount = !creditAccount || item.credit_account_code === creditAccount;

      return matchKeyword && matchAccount;
    });
  }, [slips, keyword, creditAccount]);

  // 4. Phân trang
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredSlips, 10);

  // 5. Xử lý xóa (Soft Delete)
  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phiếu chi số "${item.id}"?`)) return;

    try {
      await paymentSlipService.remove(item.id);
      toast.error(`Đã xoá phiếu chi "${item.id}"`);
      refresh(); // Tải lại dữ liệu
    } catch (err) {
      toast.error(err?.message || "Không thể xoá phiếu chi");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setCreditAccount("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu phiếu chi...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý phiếu chi"
        createLabel="Lập phiếu chi"
        createIcon={<FaPlus />}
        onCreate={() => navigate("/finance/phieu-chi/them-moi")}
        onRestore={() => navigate("/finance/phieu-chi/khoi-phuc")}
      />

      <PaymentSlipFilter
        keyword={keyword}
        creditAccount={creditAccount}
        
        // Options lọc tài khoản chi
        accountOptions={[
          { value: "111", label: "111 - Tiền mặt" },
          { value: "112", label: "112 - Tiền gửi ngân hàng" },
        ]}
        
        onKeywordChange={setKeyword}
        onAccountChange={setCreditAccount}
        onClear={handleClearFilter}
      />

      <PaymentSlipTable
        data={paginatedData}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Actions
        onRowClick={(item) => navigate(`/finance/phieu-chi/${item.id}`)}
        onView={(item) => navigate(`/finance/phieu-chi/${item.id}`)}
        onEdit={(item) => navigate(`/finance/phieu-chi/${item.id}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}