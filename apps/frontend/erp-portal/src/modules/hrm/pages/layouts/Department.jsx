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
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

/* =========================
 * Helpers
 * ========================= */
const normalizeText = (v) => String(v || "").trim().toLowerCase();

export default function Department() {
  const navigate = useNavigate();
  const toast = useToast();

  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.HRM_DEPARTMENT_UPDATE);

  const { data: departments, loading, refresh } = useAsyncData(departmentService.getAll);

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");

  const statusOptions = useMemo(
    () => [
      { value: "Hoạt động", label: "Hoạt động" },
      { value: "Ngưng hoạt động", label: "Ngưng hoạt động" },
    ],
    []
  );

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

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý phòng ban"
        createLabel="Thêm phòng ban"
        onCreate={canEdit ? () => navigate("/hrm/phong-ban/them-moi") : null}
        onRestore={canEdit ? () => navigate("/hrm/phong-ban/khoi-phuc") : null}
      />

      <DepartmentFilter
        keyword={keyword}
        status={status}
        statusOptions={statusOptions}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <DepartmentTable
        data={paginatedData}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        onRowClick={(d) => navigate(`/hrm/phong-ban/${d.code}`)}
        onView={(d) => navigate(`/hrm/phong-ban/${d.code}`)}
        onEdit={canEdit ? (d) => navigate(`/hrm/phong-ban/${d.code}/chinh-sua`) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />
    </div>
  );
}
