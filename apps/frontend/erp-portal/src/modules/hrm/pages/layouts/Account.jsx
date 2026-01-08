// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/Account.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import AccountTable from "../../components/layouts/AccountTable";
import AccountFilter from "../../components/layouts/AccountFilter";
import { accountService } from "../../services/account.service";
import "../styles/document.css";
import { FaPlus, FaRecycle } from "react-icons/fa";
import { ROLES } from "../../../../shared/constants/roles"


export default function Account() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 10;

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    let alive = true;

    const loadAccounts = async () => {
      setLoading(true);
      try {
        const data = await accountService.getActive();
        if (!alive) return;
        setAccounts(data);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadAccounts();
    return () => {
      alive = false;
    };
  }, []);

  /* ================= FILTER ================= */

  const filteredAccounts = useMemo(() => {
    const kw = keyword.toLowerCase();

    return accounts.filter((a) => {
      // 🔒 chỉ account chưa xoá (đã được service đảm bảo)
      if (a.deletedAt) return false;

      const matchKeyword =
        a.username?.toLowerCase().includes(kw) ||
        a.employee?.name?.toLowerCase().includes(kw) ||
        a.employee?.email?.toLowerCase().includes(kw);

      const matchStatus = status ? a.status === status : true;
      const matchRole = role ? a.role === role : true;

      return matchKeyword && matchStatus && matchRole;
    });
  }, [accounts, keyword, status, role]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAccounts.length / pageSize)
  );

  /* ================= PAGINATION ================= */

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, page]);

  /* ================= RENDER ================= */

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  return (
    <div className="main-document">
      {/* HEADER */}
      <div className="page-header">
        <h2>Quản lý tài khoản</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn-primary"
            onClick={() =>
              navigate("/hrm/tai-khoan/them-moi")
            }
          >
            <FaPlus />
            <span>Thêm tài khoản</span>
          </button>

          <button
            className="btn-restore"
            onClick={() =>
              navigate("/hrm/tai-khoan/khoi-phuc")
            }
          >
            <FaRecycle />
            <span>Khôi phục</span>
          </button>
        </div>
      </div>

      {/* FILTER */}
      <AccountFilter
        keyword={keyword}
        status={status}
        role={role}
        statusOptions={[
          { value: "Hoạt động", label: "Hoạt động" },
          { value: "Ngưng hoạt động", label: "Ngưng hoạt động" },
        ]}
        roleOptions={[
          { value: ROLES.ADMIN, label: "Admin" },
          { value: ROLES.HR_MANAGER, label: "HR Manager" },
          { value: ROLES.HR_EMPLOYEE, label: "HR Employee" },
          { value: ROLES.SCM_MANAGER, label: "SCM Manager" },
          { value: ROLES.SCM_EMPLOYEE, label: "SCM Employee" },
          { value: ROLES.SALES_CRM_MANAGER, label: "Sales CRM Manager" },
          { value: ROLES.SALES_CRM_EMPLOYEE, label: "Sales CRM Employee" },
          { value: ROLES.SUPPLY_CHAIN_MANAGER, label: "Supply Chain Manager" },
          { value: ROLES.SUPPLY_CHAIN_EMPLOYEE, label: "Supply Chain Employee" },
          { value: ROLES.FINANCE_ACCOUNTING_MANAGER, label: "Finance Accounting Manager" },
          { value: ROLES.FINANCE_ACCOUNTING_EMPLOYEE, label: "Finance Accounting Employee" },
        ]}
        onKeywordChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onRoleChange={(v) => {
          setRole(v);
          setPage(1);
        }}
      />

      {/* TABLE */}
      <AccountTable
        data={paginatedAccounts}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() =>
          setPage((p) => Math.min(p + 1, totalPages))
        }
        onRowClick={(a) =>
          navigate(`/hrm/tai-khoan/${a.username}`)
        }
        onView={(a) =>
          navigate(`/hrm/tai-khoan/${a.username}`)
        }
        onEdit={(a) =>
          navigate(
            `/hrm/tai-khoan/${a.username}/chinh-sua`
          )
        }
        onDelete={async (a) => {
          if (
            window.confirm(`Xoá tài khoản ${a.username}?`)
          ) {
            await accountService.remove(a.username);
            setAccounts((prev) =>
              prev.filter(
                (x) => x.username !== a.username
              )
            );
          }
        }}
      />
    </div>
  );
}