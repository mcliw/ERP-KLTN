// apps/frontend/erp-portal/src/modules/finance/pages/PostingRulesRestore.jsx

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";

// Components
import PostingRulesTable from "../../components/layouts/PostingRulesTable";

// Services
import { postingRulesService } from "../../services/postingRules.service";
import { faAccountService } from "../../services/faAccount.service";

// Hooks
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../../../../shared/styles/document.css";

export default function PostingRulesRestore() {
  const navigate = useNavigate();
  const [accountMap, setAccountMap] = useState({});

  // 1. Tạo Service Proxy: 
  // Vì mặc định getAll() chỉ lấy active, ta cần override để lấy tất cả (gồm inactive)
  // giúp hook useRestoreResource có dữ liệu để lọc.
  const serviceForRestore = useMemo(() => ({
    ...postingRulesService,
    getAll: () => postingRulesService.getAll({ includeInactive: true }),
  }), []);

  // 2. Logic lọc: Chỉ lấy những quy tắc có is_active = false
  const ruleFilter = useCallback((item) => item.is_active === false, []);

  // 3. Sử dụng Hook Restore
  const { 
    data, loading, page, setPage, totalPages, handleRestore, handleDestroy, goBack 
  } = useRestoreResource(
    serviceForRestore, // Truyền service đã override
    "id", 
    "quy tắc định khoản",
    ruleFilter
  );

  // 4. Load danh sách Tài khoản để hiển thị tên trong bảng
  useEffect(() => {
    let mounted = true;
    const fetchMap = async () => {
      try {
        const allAccounts = await faAccountService.getAll({ includeInactive: true });
        if (mounted) {
          const map = {};
          allAccounts.forEach(acc => {
            // Map ID -> Object info để Table sử dụng
            map[String(acc.id)] = { 
                account_code: acc.account_code, 
                account_name: acc.account_name 
            };
          });
          setAccountMap(map);
        }
      } catch (err) {
        console.error("Failed to load account map", err);
      }
    };
    fetchMap();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Đang tải danh sách thùng rác...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Quy tắc định khoản đã xóa</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <PostingRulesTable
        data={data}
        accountMap={accountMap} // Truyền map để hiển thị tên TK Nợ/Có
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        
        // Disable các hành động xem/sửa thông thường
        onView={(item) => navigate(`/finance/dinh-khoan/${item.id}`)}
        onEdit={null}
        onDelete={null}
        
        // Custom Actions cho trang Restore
        renderExtraActions={(item) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button 
                title="Khôi phục hoạt động" 
                className="action-btn restore-btn"
                onClick={() => handleRestore(item)}
            >
              <FaUndo />
            </button>
            
            <button 
                title="Xoá vĩnh viễn" 
                className="action-btn destroy-btn"
                onClick={() => handleDestroy(item)} 
                style={{ color: "#dc2626" }}
            >
              <FaTrash />
            </button>
          </div>
        )}
      />
    </div>
  );
}