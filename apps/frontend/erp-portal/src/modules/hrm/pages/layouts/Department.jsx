// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/Department.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import DepartmentTable from "../../components/layouts/DepartmentTable";
import DepartmentFilter from "../../components/layouts/DepartmentFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { departmentService } from "../../services/department.service";
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

export default function Department() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.DEPARTMENT_EDIT);

  const { data: departments, total, loading, refresh } = useAsyncData(
    () => departmentService.getAll(params), 
    [params] // Load lại khi params thay đổi
  );
  const statusOptions = useMemo(() => [
    { value: "Hoạt động", label: "Hoạt động" },
    { value: "Ngưng hoạt động", label: "Ngưng hoạt động" },
  ], []);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [params, setParams] = useState({
    keyword: "",
    status: "",
    page: 1,
    limit: 7
  });


  const filteredDepartments = useMemo(() => {
    const kw = normalizeText(keyword);

    return departments.filter((d) => {
      const matchKeyword =
        !kw ||
        normalizeText(d.name).includes(kw) ||
        normalizeText(d.code).includes(kw);

      const matchStatus = !status || (!isSoftDeleted(d.deletedAt) && d.status === status);

      return matchKeyword && matchStatus;
    });
  }, [departments, keyword, status]);

  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredDepartments, 7);

  const handleClearFilter = useCallback(() => {
    setKeyword("");
    setStatus("");
  }, []);

  const handleDelete = useCallback(
    async (dept) => {
      if (dept.employeeCount > 0) {
        toast.info("Không thể xoá phòng ban vì vẫn còn nhân viên.");
        return;
      }

      if (!window.confirm(`Xoá phòng ban "${dept.name}"?`)) return;

      try {
        await departmentService.remove(dept.code);
        toast.error(`Đã xoá phòng ban "${dept.name}"`);
        refresh();
      } catch (err) {
        toast.error(err?.message || "Không thể xoá phòng ban");
      }
    },
    [refresh, toast]
  );

  const handleKeywordChange = (val) => setParams(p => ({ ...p, keyword: val, page: 1 }));
  const handleStatusChange = (val) => setParams(p => ({ ...p, status: val, page: 1 }));
  const handleClear = () => setParams({ keyword: "", status: "", page: 1, limit: 7 });

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý phòng ban"
        createLabel="Thêm phòng ban"
        onCreate={() => navigate("/hrm/phong-ban/them-moi")}
      />

      <DepartmentFilter
        keyword={params.keyword}
        status={params.status}
        statusOptions={statusOptions}
        onKeywordChange={handleKeywordChange}
        onStatusChange={handleStatusChange}
        onClear={handleClear}
      />

      <DepartmentTable
        data={departments} // Lúc này departments chắc chắn là Array vì service đã bóc tách .content
        page={params.page}
        totalPages={Math.ceil(total / params.limit)}
        onPrev={() => setParams(p => ({ ...p, page: p.page - 1 }))}
        onNext={() => setParams(p => ({ ...p, page: p.page + 1 }))}
        onRowClick={(d) => navigate(`/hrm/phong-ban/${d.code}`)}
        onView={(d) => navigate(`/hrm/phong-ban/${d.code}`)}
        onEdit={canEdit ? (d) => navigate(`/hrm/phong-ban/${d.code}/chinh-sua`) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />
    </div>
  );
}
