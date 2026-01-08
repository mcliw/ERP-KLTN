// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/Department.jsx

import { useNavigate } from "react-router-dom";
import {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import DepartmentTable from "../../components/layouts/DepartmentTable";
import DepartmentFilter from "../../components/layouts/DepartmentFilter";
import { departmentService } from "../../services/department.service";
import "../styles/document.css";
import "../../../../shared/styles/button.css";
import { FaPlus, FaRecycle } from "react-icons/fa";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";

/* =========================
 * Helpers
 * ========================= */

const normalizeText = (v) =>
  String(v || "").trim().toLowerCase();

/* =========================
 * Component
 * ========================= */

export default function Department() {
  const navigate = useNavigate();

  /* =========================
   * State
   * ========================= */

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 7;

  const user = useAuthStore((s) => s.user);

  const canEditDepartment = hasPermission(
    user?.role,
    HRM_PERMISSIONS.DEPARTMENT_EDIT
  );

  /* =========================
   * Data loader
   * ========================= */

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await departmentService.getAll();
      setDepartments(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  /* =========================
   * Filter options
   * ========================= */

  const statusOptions = [
    { value: "Hoạt động", label: "Hoạt động" },
    { value: "Ngưng hoạt động", label: "Ngưng hoạt động" },
  ];

  /* =========================
   * Filtering
   * ========================= */

  const filteredDepartments = useMemo(() => {
    const kw = normalizeText(keyword);

    return departments.filter((d) => {
      const matchKeyword =
        !kw ||
        normalizeText(d.name).includes(kw) ||
        normalizeText(d.code).includes(kw);

      const matchStatus =
        !status || d.status === status;

      return matchKeyword && matchStatus;
    });
  }, [departments, keyword, status]);

  /* =========================
   * Pagination
   * ========================= */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDepartments.length / pageSize)
  );

  const paginatedDepartments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDepartments.slice(
      start,
      start + pageSize
    );
  }, [filteredDepartments, page]);

  /* =========================
   * Handlers
   * ========================= */

  const handleDelete = async (dept) => {
    if (dept.employeeCount > 0) {
      alert(
        "Không thể xoá phòng ban vì vẫn còn nhân viên đang làm việc"
      );
      return;
    }

    const ok = window.confirm(
      `Xoá phòng ban ${dept.name}?`
    );
    if (!ok) return;

    try {
      await departmentService.remove(dept.code);
      await loadDepartments();
    } catch (err) {
      alert(
        err.message ||
          "Không thể xoá phòng ban"
      );
    }
  };

  /* =========================
   * Render
   * ========================= */

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  return (
    <div className="main-document">
      {/* HEADER */}
      <div className="page-header">
        <h2>Quản lý phòng ban</h2>

        <div style={{ display: "flex", gap: 10 }}>
          {canEditDepartment && (
            <button
              className="btn-primary"
              onClick={() =>
                navigate("/hrm/phong-ban/them-moi")
              }
            >
              <FaPlus />
              <span>Thêm phòng ban</span>
            </button>
          )}

          {/* ♻️ KHÔI PHỤC */}
          {canEditDepartment && (
            <button
              className="btn-restore"
              onClick={() =>
                navigate("/hrm/phong-ban/khoi-phuc")
              }
            >
              <FaRecycle />
              <span>Khôi phục</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER */}
      <DepartmentFilter
        keyword={keyword}
        status={status}
        statusOptions={statusOptions}
        onKeywordChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onClear={() => {
          setKeyword("");
          setStatus("");
          setPage(1);
        }}
      />

      {/* TABLE */}
      <DepartmentTable
        data={paginatedDepartments}
        page={page}
        totalPages={totalPages}
        onPrev={() =>
          setPage((p) => Math.max(p - 1, 1))
        }
        onNext={() =>
          setPage((p) =>
            Math.min(p + 1, totalPages)
          )
        }
        onRowClick={(d) =>
          navigate(`/hrm/phong-ban/${d.code}`)
        }
        onView={(d) =>
          navigate(`/hrm/phong-ban/${d.code}`)
        }
        onEdit={
          canEditDepartment
            ? (d) =>
                navigate(
                  `/hrm/phong-ban/${d.code}/chinh-sua`
                )
            : undefined
        }
        onDelete={canEditDepartment ? handleDelete : undefined}
      />
    </div>
  );
}