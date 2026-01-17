// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/OnLeave.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import OnLeaveTable from "../../components/layouts/OnLeaveTable";
import OnLeaveFilter from "../../components/layouts/OnLeaveFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { onLeaveService } from "../../services/onLeave.service";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { useToast } from "../../../../shared/components/ToastProvider";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";
import "../styles/document.css";
import "../../../../shared/styles/button.css";

/* =========================
 * Helpers
 * ========================= */
const normalizeText = (v) => String(v || "").trim().toLowerCase();
const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export default function OnLeave() {
  const navigate = useNavigate();
  const toast = useToast();

  const { user } = useAuthStore();
  const { departmentMap, positionMap } = useLookupMaps();

  const canManage = HRM_PERMISSIONS.LEAVE_EDIT.includes(user?.role);

  const { data: allLeaves, loading, refresh } = useAsyncData(onLeaveService.getAll);

  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [status, setStatus] = useState("");

  // options
  const departmentOptions = useMemo(
    () => Object.entries(departmentMap || {}).map(([value, label]) => ({ value, label })),
    [departmentMap]
  );

  const leaveTypeOptions = useMemo(
    () => [
      { value: "Nghỉ phép", label: "Nghỉ phép" },
      { value: "Nghỉ không lương", label: "Nghỉ không lương" },
      { value: "Nghỉ việc", label: "Nghỉ việc" },
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: "Chờ duyệt", label: "Chờ duyệt" },
      { value: "Đã duyệt", label: "Đã duyệt" },
      { value: "Từ chối", label: "Từ chối" },
    ],
    []
  );

  // phân quyền xem dữ liệu
  const accessibleLeaves = useMemo(() => {
    if (canManage) return allLeaves;

    const currentUserCode = user?.employeeCode || user?.id;
    if (!currentUserCode) return [];

    const me = normalizeCode(currentUserCode);

    return allLeaves.filter(
      (e) => normalizeCode(e.employeeCode) === me
    );
  }, [allLeaves, canManage, user]);

  const filteredOnLeaves = useMemo(() => {
    const kw = normalizeText(keyword);

    return accessibleLeaves.filter((e) => {
      // mặc định: ẩn record đã xoá mềm ở trang document
      if (isSoftDeleted(e.deletedAt)) return false;

      const matchKeyword =
        !kw ||
        normalizeText(e.employeeCode).includes(kw) ||
        normalizeText(e.employeeName).includes(kw);

      const matchDepartment = !department || normalizeCode(e.department) === normalizeCode(department);
      const matchLeaveType = !leaveType || e.leaveType === leaveType;
      const matchStatus = !status || e.status === status;

      return matchKeyword && matchDepartment && matchLeaveType && matchStatus;
    });
  }, [accessibleLeaves, keyword, department, leaveType, status]);

  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredOnLeaves, 7);

  const canEditOrDelete = useCallback(
    (item) => {
      const isPending = String(item.status || "").trim().toLowerCase() === "chờ duyệt";
      return canManage || isPending;
    },
    [canManage]
  );

  const handleClearFilter = useCallback(() => {
    setKeyword("");
    setDepartment("");
    setLeaveType("");
    setStatus("");
  }, []);

  const handleEdit = useCallback(
    (item) => {
      if (!canEditOrDelete(item)) {
        toast.info("Chỉ có thể chỉnh sửa đơn ở trạng thái 'Chờ duyệt'.");
        return;
      }
      navigate(`/hrm/nghi-phep/${item.id}/chinh-sua`);
    },
    [canEditOrDelete, navigate, toast]
  );

  const handleDelete = useCallback(
    async (item) => {
      if (!canEditOrDelete(item)) {
        toast.info("Chỉ có thể xóa đơn ở trạng thái 'Chờ duyệt'.");
        return;
      }

      if (!window.confirm("Xóa đơn nghỉ này?")) return;

      try {
        await onLeaveService.remove(item.id);
        toast.error("Đã xoá đơn nghỉ");
        refresh();
      } catch (err) {
        toast.error(err?.message || "Không thể xoá đơn nghỉ");
      }
    },
    [canEditOrDelete, refresh, toast]
  );

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý đơn nghỉ"
        createLabel="Tạo đơn nghỉ"
        onCreate={() => navigate("/hrm/nghi-phep/them-moi")}
        onRestore={() => navigate("/hrm/nghi-phep/khoi-phuc")}
      />

      <OnLeaveFilter
        keyword={keyword}
        department={department}
        leaveType={leaveType}
        status={status}
        departmentOptions={departmentOptions}
        leaveTypeOptions={leaveTypeOptions}
        statusOptions={statusOptions}
        onKeywordChange={setKeyword}
        onDepartmentChange={setDepartment}
        onLeaveTypeChange={setLeaveType}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <OnLeaveTable
        data={paginatedData}
        departmentMap={departmentMap}
        positionMap={positionMap}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        onRowClick={(item) => navigate(`/hrm/nghi-phep/${item.id}`)}
        onView={(item) => navigate(`/hrm/nghi-phep/${item.id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
