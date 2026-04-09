// apps/frontend/erp-portal/src/modules/finance/pages/FaAccountRestore.jsx

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import FaAccountTable from "../../components/layouts/FaAccountTable";
import { faAccountService } from "../../services/faAccount.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../../../../shared/styles/document.css";

export default function FaAccountRestore() {
  const navigate = useNavigate();
  const [accountMap, setAccountMap] = useState({});

  const accountFilter = useCallback((item) => item.is_active === false, []);

  // --- SỬA Ở ĐÂY ---
  const { 
    data, loading, page, setPage, totalPages, handleRestore, handleDestroy, goBack 
  } = useRestoreResource(
    faAccountService, 
    "id", 
    "tài khoản kế toán",
    accountFilter
  );
  // ----------------

  // Logic lấy map tên cha (giữ nguyên)
  useEffect(() => {
    let mounted = true;
    const fetchMap = async () => {
      try {
        const allAccounts = await faAccountService.getAll({ includeInactive: true });
        if (mounted) {
          const map = {};
          allAccounts.forEach(acc => {
            map[acc.id] = `${acc.account_code} - ${acc.account_name}`;
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

  if (loading) return <div style={{ padding: 20 }}>Đang tải danh sách ngưng hoạt động...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Tài khoản đã ngừng hoạt động</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <FaAccountTable
        data={data}
        accountMap={accountMap}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        
        onView={(item) => navigate(`/finance/he-thong-tai-khoan/${item.id}`)}
        onEdit={null}
        onDelete={null}
        
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
                title="Xoá vĩnh viễn khỏi CSDL" 
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