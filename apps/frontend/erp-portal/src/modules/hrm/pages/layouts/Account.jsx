// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/Account.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import AccountTable from "../../components/layouts/AccountTable";
import AccountFilter from "../../components/layouts/AccountFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { accountService } from "../../services/account.service";
import { ROLES } from "../../../../shared/constants/roles";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";
import { useToast } from "../../../../shared/components/ToastProvider";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";
import "../styles/document.css";
import "../../../../shared/styles/button.css";

/* =========================
 * Helpers
 * ========================= */
const normalizeText = (v) => String(v || "").trim().toLowerCase();

export default function Account() {
  const navigate = useNavigate();
  const toast = useToast();

  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.ACCOUNT);

  // Fetch data
  const { data: accounts, loading, refresh } = useAsyncData(accountService.getAll);

  // Filter state
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");

  const statusOptions = useMemo(
    () => [
      { value: "Hoạt động", label: "Hoạt động" },
      { value: "Ngưng hoạt động", label: "Ngưng hoạt động" },
    ],
    []
  );

  const roleOptions = useMemo(
    () => Object.values(ROLES).map((r) => ({ value: r, label: r })),
    []
  );

  // Filter logic (không loại bản ghi deleted ở đây để vẫn dùng chung cho trang restore nếu cần)
  // Nếu AccountTable đã show deleted state thì việc lọc deleted tuỳ nghiệp vụ; ở đây giữ default: chỉ show chưa xoá.
  const filteredAccounts = useMemo(() => {
    const kw = normalizeText(keyword);

    return accounts.filter((a) => {
      if (isSoftDeleted(a.deletedAt)) return false;

      const emp = a.employee || {};

      const matchKeyword =
        !kw ||
        normalizeText(a.username).includes(kw) ||
        normalizeText(emp.name).includes(kw) ||
        normalizeText(emp.email).includes(kw);

      const matchStatus = !status || a.status === status;
      const matchRole = !role || a.role === role;

      return matchKeyword && matchStatus && matchRole;
    });
  }, [accounts, keyword, status, role]);

  // Pagination
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredAccounts, 10);

  const handleClearFilter = useCallback(() => {
    setKeyword("");
    setStatus("");
    setRole("");
  }, []);

  // Handlers
  const handleDelete = useCallback(
    async (a) => {
      if (!window.confirm(`Xoá tài khoản "${a.username}"?`)) return;

      try {
        await accountService.remove(a.username);
        toast.error(`Đã xoá tài khoản "${a.username}"`);
        refresh();
      } catch (err) {
        toast.error(err?.message || "Không thể xoá tài khoản");
      }
    },
    [refresh, toast]
  );

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý tài khoản"
        createLabel="Thêm tài khoản"
        onCreate={canEdit ? () => navigate("/hrm/tai-khoan/them-moi") : null}
        onRestore={canEdit ? () => navigate("/hrm/tai-khoan/khoi-phuc") : null}
      />

      <AccountFilter
        keyword={keyword}
        status={status}
        role={role}
        statusOptions={statusOptions}
        roleOptions={roleOptions}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
        onRoleChange={setRole}
        onClear={handleClearFilter}
      />

      <AccountTable
        data={paginatedData}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        onRowClick={(a) => navigate(`/hrm/tai-khoan/${a.username}`)}
        onView={(a) => navigate(`/hrm/tai-khoan/${a.username}`)}
        onEdit={canEdit ? (a) => navigate(`/hrm/tai-khoan/${a.username}/chinh-sua`) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />
    </div>
  );
}
