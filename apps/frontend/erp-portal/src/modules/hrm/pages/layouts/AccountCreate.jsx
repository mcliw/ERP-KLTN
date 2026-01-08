// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/AccountCreate.jsx

import { useNavigate } from "react-router-dom";
import AccountForm from "../../components/layouts/AccountForm";
import { accountService } from "../../services/account.service";
import { ROLES } from "../../../../shared/constants/roles"

export default function AccountCreate() {
  const navigate = useNavigate();

  /* ================= HANDLER ================= */

  const handleCreate = async (data) => {
    try {
      await accountService.create(data);
      navigate("/hrm/tai-khoan");
    } catch (e) {
      if (e?.status === 409 && e?.field === "username") {
        alert("Tên đăng nhập đã tồn tại");
      } else if (
        e?.status === 409 &&
        e?.field === "employeeCode"
      ) {
        alert("Nhân viên này đã có tài khoản");
      } else if (e?.status === 400) {
        alert(e.message || "Dữ liệu không hợp lệ");
      } else {
        alert("Có lỗi xảy ra khi tạo tài khoản");
      }
    }
  };

  /* ================= RENDER ================= */

  return (
    <div style={{ padding: 20 }}>
      <AccountForm
        mode="create"
        roleOptions={[
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
        ]}
        onSubmit={handleCreate}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
