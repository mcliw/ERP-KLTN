// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/Department.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import DepartmentTable from "../../components/layouts/DepartmentTable";
import DepartmentFilter from "../../components/layouts/DepartmentFilter";
import { departmentService } from "../../services/department.service";
import "../styles/document.css";
import { FaPlus } from "react-icons/fa";

export default function Department() {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 10;

  // ✅ FETCH DATA
  useEffect(() => {
    departmentService.getAll().then((data) => {
      setDepartments(data);
      setLoading(false);
    });
  }, []);

  // ✅ FILTER
  const filteredDepartments = useMemo(() => {
    return departments.filter(
      (d) =>
        (d.name?.toLowerCase().includes(keyword.toLowerCase()) ||
          d.code?.toLowerCase().includes(keyword.toLowerCase())) &&
        (status ? d.status === status : true)
    );
  }, [departments, keyword, status]);

  const totalPages = Math.ceil(filteredDepartments.length / pageSize);

  // ✅ PAGINATION
  const paginatedDepartments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDepartments.slice(start, start + pageSize);
  }, [filteredDepartments, page]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      {/* HEADER */}
      <div className="page-header">
        <h2>Quản lý phòng ban</h2>
        <button
          className="btn-primary"
          onClick={() => navigate("/hrm/phong-ban/them-moi")}
        >
          <FaPlus />
          <span>Thêm phòng ban</span>
        </button>
      </div>

      {/* FILTER */}
      <DepartmentFilter
        keyword={keyword}
        status={status}
        onKeywordChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />

      {/* TABLE */}
      <DepartmentTable
        data={paginatedDepartments}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        onRowClick={(d) =>
          navigate(`/hrm/phong-ban/${d.code}`)
        }
        onView={(d) =>
          navigate(`/hrm/phong-ban/${d.code}`)
        }
        onEdit={(d) =>
          navigate(`/hrm/phong-ban/${d.code}/chinh-sua`)
        }
        onDelete={async (d) => {
          if (window.confirm(`Xoá phòng ban ${d.name}?`)) {
            await departmentService.remove(d.code);
            setDepartments((prev) =>
              prev.filter((x) => x.code !== d.code)
            );
          }
        }}
      />
    </div>
  );
}