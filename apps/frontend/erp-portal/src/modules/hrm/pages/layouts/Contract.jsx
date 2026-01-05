// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/Contract.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useCallback } from "react";
import ContractTable from "../../components/layouts/ContractTable";
import ContractFilter from "../../components/layouts/ContractFilter";
import { contractService } from "../../services/contract.service";
import { employeeService } from "../../services/employee.service";
import "../styles/document.css";
import "../../../../shared/styles/button.css";
import { FaFileContract, FaRecycle } from "react-icons/fa";

/* =========================
 * Helpers
 * ========================= */

const normalizeText = (v) =>
  String(v || "").trim().toLowerCase();

export default function Contract() {
  const navigate = useNavigate();

  /* =========================
   * State
   * ========================= */

  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [contractType, setContractType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 7;

  /* =========================
   * Data loader
   * ========================= */

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, e] = await Promise.all([
        contractService.getAll(),
        employeeService.getAll(),
      ]);
      setContracts(c);
      setEmployees(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* =========================
   * Filter options
   * ========================= */

  const employeeOptions = useMemo(() => {
    return employees.map((e) => ({
      value: e.code,
      label: `${e.code} - ${e.name}`,
    }));
  }, [employees]);

  const contractTypeOptions = [
    { value: "Thử việc", label: "Thử việc" },
    { value: "Xác định thời hạn", label: "Xác định thời hạn" },
    {
      value: "Không xác định thời hạn",
      label: "Không xác định thời hạn",
    },
  ];

  const statusOptions = [
    { value: "Hiệu lực", label: "Hiệu lực" },
    { value: "Hết hạn", label: "Hết hạn" },
    { value: "Huỷ", label: "Huỷ" },
  ];

  /* =========================
   * Filtering
   * ========================= */

  const filteredContracts = useMemo(() => {
    const kw = normalizeText(keyword);

    return contracts.filter((c) => {
      const emp = employees.find(
        (e) => e.code === c.employeeCode
      );

      const matchKeyword =
        !kw ||
        c.contractCode?.toLowerCase().includes(kw) ||
        emp?.name?.toLowerCase().includes(kw);

      const matchEmployee =
        !employeeCode || c.employeeCode === employeeCode;

      const matchType =
        !contractType || c.contractType === contractType;

      const matchStatus =
        !status || c.status === status;

      return (
        matchKeyword &&
        matchEmployee &&
        matchType &&
        matchStatus
      );
    });
  }, [
    contracts,
    employees,
    keyword,
    employeeCode,
    contractType,
    status,
  ]);

  /* =========================
   * Pagination
   * ========================= */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredContracts.length / pageSize)
  );

  const paginatedContracts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredContracts.slice(start, start + pageSize);
  }, [filteredContracts, page]);

  /* =========================
   * Handlers
   * ========================= */

  const handleDelete = async (contract) => {
    const ok = window.confirm(
      `Huỷ hợp đồng ${contract.contractCode}?`
    );
    if (!ok) return;

    await contractService.remove(contract.contractCode);
    await loadData();
  };

  /* =========================
   * Render
   * ========================= */

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Quản lý hợp đồng lao động</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn-primary"
            onClick={() =>
              navigate("/hrm/hop-dong-lao-dong/them-moi")
            }
          >
            <FaFileContract />
            <span>Tạo hợp đồng</span>
          </button>

          <button
            className="btn-restore"
            onClick={() =>
              navigate("/hrm/hop-dong-lao-dong/khoi-phuc")
            }
          >
            <FaRecycle />
            <span>Khôi phục</span>
          </button>
        </div>
      </div>

      <ContractFilter
        keyword={keyword}
        employeeCode={employeeCode}
        contractType={contractType}
        status={status}
        employeeOptions={employeeOptions}
        contractTypeOptions={contractTypeOptions}
        statusOptions={statusOptions}
        onKeywordChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        onEmployeeChange={(v) => {
          setEmployeeCode(v);
          setPage(1);
        }}
        onContractTypeChange={(v) => {
          setContractType(v);
          setPage(1);
        }}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onClear={() => {
          setKeyword("");
          setEmployeeCode("");
          setContractType("");
          setStatus("");
          setPage(1);
        }}
      />

      <ContractTable
        data={paginatedContracts}
        employees={employees}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() =>
          setPage((p) => Math.min(p + 1, totalPages))
        }
        onRowClick={(c) =>
          navigate(
            `/hrm/hop-dong-lao-dong/${c.contractCode}`
          )
        }
        onView={(c) =>
          navigate(
            `/hrm/hop-dong-lao-dong/${c.contractCode}`
          )
        }
        onEdit={(c) =>
          navigate(
            `/hrm/hop-dong-lao-dong/${c.contractCode}/chinh-sua`
          )
        }
        onDelete={handleDelete}
      />
    </div>
  );
}