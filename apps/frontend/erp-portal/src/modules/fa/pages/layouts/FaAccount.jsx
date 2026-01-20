// apps/frontend/erp-portal/src/modules/finance/pages/layouts/FaAccount.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaPlus } from "react-icons/fa";
import FaAccountTable from "../../components/layouts/FaAccountTable";
import FaAccountFilter from "../../components/layouts/FaAccountFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { faAccountService } from "../../services/faAccount.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

// Định nghĩa Options cho Loại tài khoản (đưa ra ngoài hoặc import từ constants)
const ACCOUNT_TYPE_OPTIONS = [
  { value: "ASSET", label: "Tài sản" },
  { value: "LIABILITY", label: "Nợ phải trả" },
  { value: "EQUITY", label: "Vốn chủ sở hữu" },
  { value: "REVENUE", label: "Doanh thu" },
  { value: "EXPENSE", label: "Chi phí" },
];

export default function FaAccount() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Tải toàn bộ dữ liệu tài khoản
  // includeInactive: true để lấy cả dòng đã xóa mềm nhằm hiển thị đầy đủ cây thư mục nếu cần
  const { data: accounts, loading, refresh } = useAsyncData(() => 
    faAccountService.getAll({ includeInactive: true })
  );

  // 2. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  const [accountType, setAccountType] = useState(""); // [Mới] Filter theo loại TK
  const [parentAccountId, setParentAccountId] = useState("");
  const [status, setStatus] = useState("");

  // 3. Tạo Map và Options từ dữ liệu đã tải (Client-side processing)
  const { accountMap, parentOptions } = useMemo(() => {
    const map = {};
    const options = [];

    (accounts || []).forEach((acc) => {
      // 1. Map dùng cho Table để hiển thị thông tin cha (ID -> Code - Name)
      // Dùng account_id làm key map
      map[acc.account_id] = `${acc.account_code} - ${acc.account_name}`;

      // 2. Options dùng cho Filter Select
      // Chỉ lấy những tài khoản active để hiển thị trong dropdown filter cha
      if (acc.is_active) {
        options.push({
          value: acc.account_id, // Value là ID
          label: `${acc.account_code} - ${acc.account_name}` // Label hiển thị rõ ràng
        });
      }
    });

    // Sắp xếp options theo code
    options.sort((a, b) => a.label.localeCompare(b.label));

    return { accountMap, parentOptions: options };
  }, [accounts]);

  // 4. Logic lọc dữ liệu (Client-side filtering)
  const filteredAccounts = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    
    return (accounts || []).filter((item) => {
      // Lọc theo từ khóa (Số hiệu hoặc Tên)
      const matchKeyword =
        !kw ||
        (item.account_name || "").toLowerCase().includes(kw) ||
        (item.account_code || "").toLowerCase().includes(kw);

      // Lọc theo Loại tài khoản
      const matchType = !accountType || item.account_type === accountType;

      // Lọc theo Parent ID (So sánh string để an toàn)
      const matchParent = !parentAccountId || String(item.parent_account_id) === String(parentAccountId);

      // Lọc theo Trạng thái (item.is_active là boolean, status filter là string "true"/"false")
      const matchStatus = !status || String(item.is_active) === status;

      return matchKeyword && matchType && matchParent && matchStatus;
    });
  }, [accounts, keyword, accountType, parentAccountId, status]);

  // 5. Phân trang client-side
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredAccounts, 10);

  // 6. Xử lý xóa (Soft delete / Inactive)
  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn ngừng hoạt động tài khoản "${item.account_code} - ${item.account_name}"?`)) return;

    try {
      await faAccountService.remove(item.account_id);
      toast.error(`Đã ngừng hoạt động tài khoản "${item.account_code}"`);
      refresh(); // Tải lại dữ liệu
    } catch (err) {
      toast.error(err?.message || "Không thể xóa tài khoản");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setAccountType("");
    setParentAccountId("");
    setStatus("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu kế toán...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Hệ thống tài khoản kế toán"
        createLabel="Thêm tài khoản"
        createIcon={<FaPlus />}
        // Đường dẫn giả định module finance
        onCreate={() => navigate("/finance/he-thong-tai-khoan/them-moi")}
        onRestore={() => navigate("/finance/he-thong-tai-khoan/khoi-phuc")}
      />

      <FaAccountFilter
        keyword={keyword}
        accountType={accountType}
        parentAccountId={parentAccountId}
        status={status}
        
        typeOptions={ACCOUNT_TYPE_OPTIONS}
        parentOptions={parentOptions}
        statusOptions={[
          { value: "true", label: "Hoạt động" },
          { value: "false", label: "Ngừng hoạt động" },
        ]}
        
        onKeywordChange={setKeyword}
        onTypeChange={setAccountType}
        onParentChange={setParentAccountId}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <FaAccountTable
        data={paginatedData}
        accountMap={accountMap} // Map ID -> Code/Name cho cột Tài khoản cha
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Điều hướng & Action
        onRowClick={(item) => navigate(`/finance/he-thong-tai-khoan/${item.account_id}`)}
        onView={(item) => navigate(`/finance/he-thong-tai-khoan/${item.account_id}`)}
        onEdit={(item) => navigate(`/finance/he-thong-tai-khoan/${item.account_id}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}