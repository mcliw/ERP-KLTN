// apps/frontend/erp-portal/src/modules/finance/pages/layouts/PostingRules.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback, useEffect } from "react";
import { FaPlus } from "react-icons/fa";

// Components
import PostingRulesTable from "../../components/layouts/PostingRulesTable";
import PostingRulesFilter from "../../components/layouts/PostingRulesFilter";
import PageHeader from "../../../../shared/components/PageHeader";

// Services
import { postingRulesService } from "../../services/postingRules.service";
import { faAccountService } from "../../services/faAccount.service";

// Hooks & Utils
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

export default function PostingRules() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Load danh sách Quy tắc định khoản (Main Data)
  // Mặc định getAll() chỉ lấy các rule có is_active = true
  const fetchRules = useCallback(() => {
    return postingRulesService.getAll();
  }, []);

  const { data: rules, loading: loadingRules, refresh } = useAsyncData(fetchRules);

  // 2. Load danh sách Tài khoản (Reference Data) để map ID -> Name
  const [accounts, setAccounts] = useState([]);
  
  useEffect(() => {
    let mounted = true;
    const loadAccounts = async () => {
      try {
        // Lấy danh sách tài khoản (lấy all để hiển thị lịch sử nếu có tài khoản cũ bị inactive)
        const list = await faAccountService.getAll({ includeInactive: true });
        if (mounted) setAccounts(list);
      } catch (err) {
        console.error("Failed to load accounts for mapping", err);
      }
    };
    loadAccounts();
    return () => { mounted = false; };
  }, []);

  // 3. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  const [moduleSource, setModuleSource] = useState("");
  const [accountId, setAccountId] = useState(""); // Lọc các bút toán dính đến tài khoản này

  // 4. Chuẩn bị dữ liệu Map và Options (Client-side processing)
  const { accountMap, accountOptions } = useMemo(() => {
    const map = {};
    const options = [];

    (accounts || []).forEach((acc) => {
      const label = `${acc.account_code} - ${acc.account_name}`;
      
      // 4.1 Map dùng cho Table: { "id": { account_code, account_name } }
      map[String(acc.id)] = {
        account_code: acc.account_code,
        account_name: acc.account_name
      };

      // 4.2 Options dùng cho Filter Select
      // Chỉ đưa vào filter những tài khoản active
      if (acc.is_active) {
        options.push({
          value: String(acc.id),
          label: label
        });
      }
    });

    // Sắp xếp options theo code tăng dần
    options.sort((a, b) => a.label.localeCompare(b.label));

    return { accountMap: map, accountOptions: options };
  }, [accounts]);

  // 5. Logic lọc dữ liệu (Client-side filtering)
  const filteredRules = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    
    return (rules || []).filter((item) => {
      // a. Lọc theo từ khóa (Mã sự kiện hoặc Diễn giải)
      const matchKeyword =
        !kw ||
        (item.event_code || "").toLowerCase().includes(kw) ||
        (item.event_description || "").toLowerCase().includes(kw);

      // b. Lọc theo Phân hệ
      const matchModule = !moduleSource || item.module_source === moduleSource;

      // c. Lọc theo Tài khoản (Tìm trong cả Nợ VÀ Có)
      const matchAccount = !accountId || 
        String(item.debit_account_id) === String(accountId) || 
        String(item.credit_account_id) === String(accountId);

      return matchKeyword && matchModule && matchAccount;
    });
  }, [rules, keyword, moduleSource, accountId]);

  // 6. Phân trang client-side
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredRules, 10);

  // 7. Xử lý xóa (Soft Delete - Ngừng hoạt động)
  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn xóa (ngừng hoạt động) quy tắc "${item.event_code}"?`)) return;

    try {
      // Sử dụng remove để set is_active = false
      await postingRulesService.remove(item.id); 
      toast.success(`Đã xóa quy tắc "${item.event_code}"`);
      refresh(); // Tải lại danh sách để ẩn dòng vừa xóa
    } catch (err) {
      toast.error(err?.message || "Không thể xóa quy tắc");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setModuleSource("");
    setAccountId("");
  };

  if (loadingRules) return <div style={{ padding: 20 }}>Đang tải cấu hình định khoản...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Cấu hình định khoản tự động"
        createLabel="Thêm quy tắc"
        createIcon={<FaPlus />}
        
        // Điều hướng đến trang Create
        onCreate={() => navigate("/finance/dinh-khoan/them-moi")}
        
        // [CẬP NHẬT] Điều hướng đến trang Khôi phục (Thùng rác)
        onRestore={() => navigate("/finance/dinh-khoan/khoi-phuc")}
      />

      <PostingRulesFilter
        keyword={keyword}
        moduleSource={moduleSource}
        accountId={accountId}
        
        accountOptions={accountOptions}
        
        onKeywordChange={setKeyword}
        onModuleChange={setModuleSource}
        onAccountChange={setAccountId}
        onClear={handleClearFilter}
      />

      <PostingRulesTable
        data={paginatedData}
        accountMap={accountMap}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Actions
        // Ưu tiên dùng item.id, fallback sang rule_id nếu data cũ chưa update
        onRowClick={(item) => navigate(`/finance/dinh-khoan/${item.id || item.rule_id}`)}
        onView={(item) => navigate(`/finance/dinh-khoan/${item.id || item.rule_id}`)}
        onEdit={(item) => navigate(`/finance/dinh-khoan/${item.id || item.rule_id}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}