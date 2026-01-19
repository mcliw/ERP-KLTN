// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/AccountRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import AccountTable from "../../components/layouts/AccountTable";
import { accountService } from "../../services/account.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../../../../shared/styles/document.css";

export default function AccountRestore() {
  const navigate = useNavigate();

  const {
    data,
    loading,
    page,
    setPage,
    totalPages,
    handleRestore,
    handleDestroy,
    goBack,
  } = useRestoreResource(accountService, "username", "tài khoản");

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Tài khoản đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <AccountTable
        data={data}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        onView={(a) => navigate(`/hrm/tai-khoan/${a.username}`)}
        onEdit={null}
        onDelete={null}
        renderExtraActions={(a) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button title="Khôi phục" onClick={() => handleRestore(a)}>
              <FaUndo />
            </button>
            <button
              title="Xoá vĩnh viễn"
              onClick={() => handleDestroy(a)}
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
