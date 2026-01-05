// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/Account.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import AccountTable from "../../components/layouts/AccountTable";
import AccountFilter from "../../components/layouts/AccountFilter";
import { accountService } from "../../services/account.service";
import "../styles/document.css";
import { FaPlus, FaRecycle } from "react-icons/fa";

export default function Account() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 10;

  // ✅ FETCH DATA
  useEffect(() => {
    accountService.getActive().then((data) => {
      setAccounts(data);
      setLoading(false);
    });
  }, []);

  // ✅ FILTER
  const filteredAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.deleted !== true &&
        a.status !== "Đã xoá" &&

        (
          a.username?.toLowerCase().includes(keyword.toLowerCase()) ||
          a.employee?.name
            ?.toLowerCase()
            .includes(keyword.toLowerCase()) ||
          a.employee?.email
            ?.toLowerCase()
            .includes(keyword.toLowerCase())
        ) &&
        (status ? a.status === status : true) &&
        (role ? a.role === role : true)
    );
  }, [accounts, keyword, status, role]);

  const totalPages = Math.ceil(filteredAccounts.length / pageSize);

  // ✅ PAGINATION
  const paginatedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, page]);

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
          onClick={() => navigate("/hrm/tai-khoan/them-moi")}
          >
            <FaPlus />
            <span>Thêm tài khoản</span>
          </button>
          <button
            className="btn-restore"
            onClick={() => navigate("/hrm/tai-khoan/khoi-phuc")}
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
          { value: "ADMIN", label: "Admin" },
          { value: "HR", label: "HR" },
          { value: "USER", label: "User" },
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
            window.confirm(
              `Xoá tài khoản ${a.username}?`
            )
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
