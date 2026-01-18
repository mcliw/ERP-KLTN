// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/Salary.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback, useEffect } from "react";
import SalaryTable from "../../components/layouts/SalaryTable";
import SalaryFilter from "../../components/layouts/SalaryFilter";
import PageHeader from "../../../../shared/components/PageHeader";

import { salaryService } from "../../services/salary.service";
import { departmentService } from "../../services/department.service"; // Để lấy options cho filter

import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions"; // Giả định bạn đã thêm key SALARY_EDIT
import { hasPermission } from "../../../../shared/utils/permission";
import { useToast } from "../../../../shared/components/ToastProvider";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";

import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

/* =========================
 * Helpers
 * ========================= */
const normalizeText = (v) => String(v || "").trim().toLowerCase();

export default function Salary() {
  const navigate = useNavigate();
  const toast = useToast();

  const user = useAuthStore((s) => s.user);
  // Kiểm tra quyền (Nếu chưa có trong file constant, bạn có thể thay bằng string "salary.edit")
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.HRM_SALARY_INFO_UPDATE || "salary.edit");

  // 1. Fetch dữ liệu chính (Lương)
  const { data: salaries, loading, refresh } = useAsyncData(salaryService.getAll);

  // 2. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  
  // State danh sách phòng ban (cho dropdown filter)
  const [departmentOptions, setDepartmentOptions] = useState([]);

  // Fetch danh sách phòng ban khi mount
  useEffect(() => {
    departmentService.getAll({ includeDeleted: false }).then((depts) => {
      const options = (Array.isArray(depts) ? depts : []).map(d => ({
        value: d.code, // Hoặc d.id tuỳ vào cách bạn lưu trong bảng nhân viên
        label: d.name
      }));
      setDepartmentOptions(options);
    });
  }, []);

  const statusOptions = useMemo(
    () => [
      { value: "Dự thảo", label: "Dự thảo" },
      { value: "Hiệu lực", label: "Hiệu lực" },
      { value: "Hết hạn", label: "Hết hạn" },
    ],
    []
  );

  // 3. Logic lọc dữ liệu client-side
  const filteredSalaries = useMemo(() => {
    const kw = normalizeText(keyword);

    return salaries.filter((s) => {
      // Lọc theo từ khoá (Tên NV, Mã NV, Mã HĐ)
      const matchKeyword =
        !kw ||
        normalizeText(s.employeeName).includes(kw) ||
        normalizeText(s.employeeCode).includes(kw) ||
        normalizeText(s.id).includes(kw); // Giả sử ID cũng là mã hợp đồng

      // Lọc theo trạng thái
      const matchStatus = !status || (!isSoftDeleted(s.deletedAt) && s.status === status);

      // Lọc theo phòng ban
      const matchDept = !departmentId || s.departmentCode === departmentId;

      return matchKeyword && matchStatus && matchDept;
    });
  }, [salaries, keyword, status, departmentId]);

  // 4. Phân trang
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredSalaries, 10);

  const handleClearFilter = useCallback(() => {
    setKeyword("");
    setStatus("");
    setDepartmentId("");
  }, []);

  // 5. Xử lý xoá
  const handleDelete = useCallback(
    async (item) => {
      // Guard logic: Không xoá nếu đang hiệu lực
      if (item.status === "Hiệu lực" || item.status === "Active") {
        toast.info("Không thể xoá hợp đồng đang có hiệu lực.");
        return;
      }

      if (!window.confirm(`Xoá thông tin Lương & Phúc lợi của "${item.employeeName}"?`)) return;

      try {
        await salaryService.remove(item.id); // Lương dùng ID
        toast.error(`Đã xoá bản ghi Lương & Phúc lợi của "${item.employeeName}"`);
        refresh();
      } catch (err) {
        toast.error(err?.message || "Không thể xoá bản ghi");
      }
    },
    [refresh, toast]
  );

  if (loading) return <div style={{ padding: 20 }}>Đang tải danh sách lương...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý Lương & Phúc lợi"
        createLabel="Thêm mới lương"
        // Chỉ hiện nút nếu có quyền
        onCreate={canEdit ? () => navigate("/hrm/quan-ly-luong/them-moi") : null}
        onRestore={canEdit ? () => navigate("/hrm/quan-ly-luong/khoi-phuc") : null}
      />

      <SalaryFilter
        keyword={keyword}
        status={status}
        department={departmentId}
        statusOptions={statusOptions}
        departmentOptions={departmentOptions}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
        onDepartmentChange={setDepartmentId}
        onClear={handleClearFilter}
      />

      <SalaryTable
        data={paginatedData}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        // Điều hướng chi tiết (dùng ID)
        onRowClick={(d) => navigate(`/hrm/quan-ly-luong/${d.id}`)}
        onView={(d) => navigate(`/hrm/quan-ly-luong/${d.id}`)}
        // Điều hướng chỉnh sửa
        onEdit={canEdit ? (d) => navigate(`/hrm/quan-ly-luong/${d.id}/chinh-sua`) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />
    </div>
  );
}