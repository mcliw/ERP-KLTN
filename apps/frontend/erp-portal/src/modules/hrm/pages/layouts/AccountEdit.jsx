// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/AccountEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import AccountForm from "../../components/layouts/AccountForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { accountService } from "../../services/account.service";
import { ROLES } from "../../../../shared/constants/roles";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

/* =========================
 * Options
 * ========================= */
const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: "Admin" },
  { value: ROLES.HR_MANAGER, label: "HR Manager" },
  { value: ROLES.HR_EMPLOYEE, label: "HR Employee" },
  { value: ROLES.SCM_MANAGER, label: "SCM Manager" },
  { value: ROLES.SCM_EMPLOYEE, label: "SCM Employee" },
  { value: ROLES.SALES_CRM_MANAGER, label: "Sales CRM Manager" },
  { value: ROLES.SALES_CRM_EMPLOYEE, label: "Sales CRM Employee" },
  { value: ROLES.SUPPLY_CHAIN_MANAGER, label: "Supply Chain Manager" },
  { value: ROLES.SUPPLY_CHAIN_EMPLOYEE, label: "Supply Chain Employee" },
  { value: ROLES.FINANCE_ACCOUNTING_MANAGER, label: "Finance Accounting Manager" },
  { value: ROLES.FINANCE_ACCOUNTING_EMPLOYEE, label: "Finance Accounting Employee" },
];

export default function AccountEdit() {
  const params = useParams();

  // 1. Lấy username linh hoạt
  const username = useMemo(() => params.username || params.id || "", [params]);

  // 2. Breadcrumbs động
  const breadcrumbs = useMemo(
    () => [
      { label: "Trang chủ", link: "/" },
      { label: "Nhân sự", link: "/hrm" },
      { label: "Tài khoản", link: "/hrm/tai-khoan" },
      { label: `Cập nhật: ${username || "N/A"}`, active: true },
    ],
    [username]
  );

  // 3. Service functions (ổn định dependency)
  const fetcher = useCallback((id) => accountService.getByUsername(id), []);
  const updater = useCallback((id, data) => accountService.update(id, data), []);

  // 4. Hook chuẩn hóa
  const {
    data: account,
    loading,
    submitting,
    isNotFound,
    isDeleted,
    handleUpdate,
    handleCancel,
  } = useEditResource({
    id: username,
    fetcher,
    updater,
    successPath: "/hrm/tai-khoan",
    options: {
      resourceName: "tài khoản",
      transformPayload: (formData) => {
        const {
          username,
          employeeCode,
          department,
          position,
          // các field có thể chỉ phục vụ UI
          employee,
          ...rest
        } = formData;

        return rest;
      },
    },
  });

  // 5. Guards & trạng thái đặc biệt
  if (!username) {
    return (
      <PageContainer title="Thiếu thông tin" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">Thiếu username để chỉnh sửa tài khoản.</div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin tài khoản...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy tài khoản: <strong>{username}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Tài khoản đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Tài khoản <strong>{username}</strong> đã bị xóa/ngưng hoạt động. Bạn cần khôi phục
          trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  // 6. Map data về đúng shape form
  const initialFormData = useMemo(
    () => ({
      username: account?.username || "",
      employeeCode: account?.employeeCode || "",
      department: account?.employee?.departmentCode || account?.department || "",
      position: account?.employee?.positionCode || account?.position || "",
      role: account?.role || "",
      status: account?.status || "Hoạt động",
    }),
    [account]
  );

  // 7. Render Form chính
  return (
    <PageContainer title={`Cập nhật: ${username}`} breadcrumbs={breadcrumbs}>
      <AccountForm
        mode="edit"
        initialData={initialFormData}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        roleOptions={ROLE_OPTIONS}
        disabled={submitting}
        checkUsernameExists={accountService.checkUsernameExists?.bind(accountService)}
      />
    </PageContainer>
  );
}
