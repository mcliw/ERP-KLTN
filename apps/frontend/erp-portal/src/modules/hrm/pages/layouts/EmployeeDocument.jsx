// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/EmployeeDocument.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useCallback } from "react";
import EmployeeTable from "../../components/layouts/EmployeeTable";
import EmployeeFilter from "../../components/layouts/EmployeeFilter";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import { employeeService } from "../../services/employee.service";
import "../styles/document.css";
import "../../../../shared/styles/button.css";
import { FaUserPlus, FaRecycle } from "react-icons/fa";

/* =========================
 * Helpers
 * ========================= */

const normalizeText = (v) =>
  String(v || "").trim().toLowerCase();

export default function EmployeeDocument() {
  const navigate = useNavigate();
  const { departmentMap, positionMap } = useLookupMaps();

  /* =========================
   * State
   * ========================= */

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 7;

  /* =========================
   * Data loader
   * ========================= */

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await employeeService.getAll();
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  /* =========================
   * Filtering
   * ========================= */

  const departmentOptions = useMemo(
    () =>
      Object.entries(departmentMap).map(([value, label]) => ({
        value,
        label,
      })),
    [departmentMap]
  );

  const positionOptions = useMemo(() => {
    const map = new Map();

    employees.forEach((e) => {
      if (!e.position) return;

      const label =
        positionMap[e.position] || e.position;

      if (!map.has(label)) {
        map.set(label, {
          value: label, // ⚠️ dùng label làm value
          label,
        });
      }
    });

    return Array.from(map.values());
  }, [employees, positionMap]);

  const genderOptions = [
    { value: "Nam", label: "Nam" },
    { value: "Nữ", label: "Nữ" },
    { value: "Khác", label: "Khác" },
  ];

  const statusOptions = [
    { value: "Đang làm việc", label: "Đang làm việc" },
    { value: "Nghỉ việc", label: "Nghỉ việc" },
  ];

  const filteredEmployees = useMemo(() => {
    const kw = keyword.trim().toLowerCase();

    return employees.filter((e) => {
      const matchKeyword =
        !kw ||
        e.name?.toLowerCase().includes(kw) ||
        e.email?.toLowerCase().includes(kw);

      const matchDepartment =
        !department || e.department === department;

      const matchPosition =
        !position || 
        (positionMap[e.position] || e.position) === position;

      const matchGender =
        !gender || e.gender === gender;

      const matchStatus =
        !status || e.status === status;

      return (
        matchKeyword &&
        matchDepartment &&
        matchPosition &&
        matchGender &&
        matchStatus
      );
    });
  }, [employees, keyword, department, position, gender, status]);

  /* =========================
   * Pagination
   * ========================= */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / pageSize)
  );

  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page]);

  /* =========================
   * Handlers
   * ========================= */

  const handleDelete = async (emp) => {
    const ok = window.confirm(`Xoá hồ sơ ${emp.name}?`);
    if (!ok) return;

    await employeeService.remove(emp.code);
    await loadEmployees();
  };

  const handleClearFilter = () => {
    setKeyword("");
    setDepartment("");
    setStatus("");
    setPage(1);
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
        <h2>Quản lý hồ sơ nhân viên</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button
          className="btn-primary"
          onClick={() => navigate("/hrm/ho-so-nhan-vien/them-moi")}
          >
            <FaUserPlus />
            <span>Tạo hồ sơ</span>
          </button>
          <button
            className="btn-restore"
            onClick={() => navigate("/hrm/ho-so-nhan-vien/khoi-phuc")}
          >
            <FaRecycle />
            <span>Khôi phục</span>
          </button>
        </div>
      </div>

      <EmployeeFilter
        keyword={keyword}
        department={department}
        position={position}
        gender={gender}
        status={status}
        departmentOptions={departmentOptions}
        positionOptions={positionOptions}
        genderOptions={genderOptions}
        statusOptions={statusOptions}
        onKeywordChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        onDepartmentChange={(v) => {
          setDepartment(v);
          setPosition(""); // reset chức vụ khi đổi phòng ban
          setPage(1);
        }}
        onPositionChange={(v) => {
          setPosition(v);
          setPage(1);
        }}
        onGenderChange={(v) => {
          setGender(v);
          setPage(1);
        }}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onClear={() => {
          setKeyword("");
          setDepartment("");
          setPosition("");
          setGender("");
          setStatus("");
          setPage(1);
        }}
      />

      <EmployeeTable
        data={paginatedEmployees}
        departmentMap={departmentMap}
        positionMap={positionMap}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() =>
          setPage((p) => Math.min(p + 1, totalPages))
        }
        onRowClick={(emp) =>
          navigate(`/hrm/ho-so-nhan-vien/${emp.code}`)
        }
        onView={(emp) =>
          navigate(`/hrm/ho-so-nhan-vien/${emp.code}`)
        }
        onEdit={(emp) =>
          navigate(
            `/hrm/ho-so-nhan-vien/${emp.code}/chinh-sua`
          )
        }
        onDelete={handleDelete}
      />
    </div>
  );
}