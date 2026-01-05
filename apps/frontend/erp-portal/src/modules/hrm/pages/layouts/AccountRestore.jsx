// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/AccountRestore.jsx

import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import AccountTable from "../../components/layouts/AccountTable";
import { accountService } from "../../services/account.service";
import "../styles/document.css";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";

export default function AccountRestore() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    accountService.getAll().then((data) => {
      const deletedAccounts = data.filter(
        (a) =>
          a.deleted === true ||
          a.status === "Đã xoá" ||
          a.status === "Ngưng hoạt động"
      );

      setAccounts(deletedAccounts);
      setLoading(false);
    });
  }, []);

  const totalPages = Math.ceil(accounts.length / pageSize);

  const paginatedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return accounts.slice(start, start + pageSize);
  }, [accounts, page]);

  const handleRestore = async (account) => {
    if (!window.confirm(`Khôi phục tài khoản ${account.username}?`)) return;

    try {
      await accountService.update(account.username, {
        status: "Hoạt động",
        deleted: false,
      });

      setAccounts((prev) =>
        prev.filter((a) => a.username !== account.username)
      );
    } catch (e) {
      alert("Không thể khôi phục tài khoản");
    }
  };

    const handleDestroy = async (account) => {
        if (
            !window.confirm(
            `Xoá VĨNH VIỄN tài khoản ${account.username}? Hành động này không thể hoàn tác!`
            )
        )
            return;

        try {
            await accountService.destroy(account.username);

            setAccounts((prev) =>
            prev.filter((a) => a.username !== account.username)
            );
        } catch (e) {
            alert("Không thể xoá vĩnh viễn tài khoản");
        }
    };

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  return (
    <div className="main-document">
      {/* HEADER */}
      <div className="page-header">
        <h2>Tài khoản đã xoá</h2>

        <button className="btn-secondary" onClick={() => navigate(-1)}>
          <FaArrowLeft style={{ marginRight: 5 }}/>
          <span>Quay lại</span>
        </button>
      </div>

      {/* TABLE */}
      <AccountTable
        data={paginatedAccounts}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        onView={(a) =>
            navigate(`/hrm/tai-khoan/${a.username}`)
        }
        onEdit={null}
        onDelete={null}
        onRowClick={null}
        renderExtraActions={(a) => (
            <div style={{ display: "flex", gap: 6 }}>
            {/* ♻️ Khôi phục */}
            <button
                title="Khôi phục"
                onClick={() => handleRestore(a)}
            >
                <FaUndo />
            </button>

            {/* 🗑️ Xoá vĩnh viễn */}
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