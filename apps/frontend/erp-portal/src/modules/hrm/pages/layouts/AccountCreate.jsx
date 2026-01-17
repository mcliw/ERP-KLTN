// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/AccountCreate.jsx

import AccountForm from "../../components/layouts/AccountForm";
import { accountService } from "../../services/account.service";
import { ROLES } from "../../../../shared/constants/roles";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

/* =========================
 * Options & Errors
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

const ACCOUNT_ERRORS = {
  username: "Tên đăng nhập đã tồn tại",
  employeeCode: "Nhân viên này đã có tài khoản",
};

export default function AccountCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => accountService.create(data),
    "/hrm/tai-khoan",
    {
      resourceName: "tài khoản",
      errorMessages: ACCOUNT_ERRORS,
      onSuccess: () => {
        console.log("Đã tạo xong tài khoản mới");
      },
    }
  );

  return (
    <PageContainer title="Thêm mới tài khoản">
      <AccountForm
        mode="create"
        roleOptions={ROLE_OPTIONS}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting}
        checkUsernameExists={accountService.checkUsernameExists?.bind(accountService)}
      />
    </PageContainer>
  );
}
