// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/PositionDocument.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import PositionTable from "../../components/layouts/PositionTable";
import PositionFilter from "../../components/layouts/PositionFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { positionService } from "../../services/position.service";
import { useLookupMaps } from "../../hooks/useLookupMaps";
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
const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export default function PositionDocument() {
  const navigate = useNavigate();
  const toast = useToast();

  const { departmentMap } = useLookupMaps();
  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.POSITION_EDIT);

  const { data: positions, loading, refresh } = useAsyncData(positionService.getAll);

  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");

  const departmentOptions = useMemo(
    () => Object.entries(departmentMap).map(([value, label]) => ({ value, label })),
    [departmentMap]
  );

  const statusOptions = useMemo(
    () => [
      { value: "Hoạt động", label: "Hoạt động" },
      { value: "Ngưng hoạt động", label: "Ngưng hoạt động" },
    ],
    []
  );

  const filteredPositions = useMemo(() => {
    const kw = normalizeText(keyword);

    return positions.filter((p) => {
      const matchKeyword =
        !kw ||
        normalizeText(p.name).includes(kw) ||
        normalizeText(p.code).includes(kw);

      const matchDepartment = !department || normalizeCode(p.department) === normalizeCode(department);

      // đồng bộ theo pattern: status filter chỉ áp dụng với bản ghi chưa bị soft delete
      const matchStatus = !status || (!isSoftDeleted(p.deletedAt) && p.status === status);

      return matchKeyword && matchDepartment && matchStatus;
    });
  }, [positions, keyword, department, status]);

  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredPositions, 7);

  const handleClearFilter = useCallback(() => {
    setKeyword("");
    setDepartment("");
    setStatus("");
  }, []);

  const handleDelete = useCallback(
    async (pos) => {
      const assigned =
        typeof pos.assigneeCount === "number" ? pos.assigneeCount : pos.assignees?.length ?? 0;

      if (assigned > 0) {
        toast.info("Không thể xoá chức vụ vì đang có nhân viên đảm nhận.");
        return;
      }

      if (!window.confirm(`Xoá chức vụ "${pos.name}"?`)) return;

      try {
        await positionService.remove(pos.code);
        toast.error(`Đã xoá chức vụ "${pos.name}"`);
        refresh();
      } catch (err) {
        toast.error(err?.message || "Không thể xoá chức vụ");
      }
    },
    [refresh, toast]
  );

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý chức vụ"
        createLabel="Thêm chức vụ"
        onCreate={canEdit ? () => navigate("/hrm/chuc-vu/them-moi") : null}
        onRestore={canEdit ? () => navigate("/hrm/chuc-vu/khoi-phuc") : null}
      />

      <PositionFilter
        keyword={keyword}
        department={department}
        status={status}
        departmentOptions={departmentOptions}
        statusOptions={statusOptions}
        onKeywordChange={setKeyword}
        onDepartmentChange={setDepartment}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <PositionTable
        data={paginatedData}
        departmentMap={departmentMap}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        onRowClick={(p) => navigate(`/hrm/chuc-vu/${p.code}`)}
        onView={(p) => navigate(`/hrm/chuc-vu/${p.code}`)}
        onEdit={canEdit ? (p) => navigate(`/hrm/chuc-vu/${p.code}/chinh-sua`) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />
    </div>
  );
}
