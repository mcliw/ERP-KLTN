// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/AccountEdit.jsx

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AccountForm from "../../components/layouts/AccountForm";
import { accountService } from "../../services/account.service";
import { ROLES } from "../../../../shared/constants/roles"

export default function AccountEdit() {
  const params = useParams();
  const navigate = useNavigate();

  /* ================= PARAM ================= */

  // ✅ Bắt username linh hoạt
  const username = useMemo(() => {
    return (
      params.username ||
      params.id ||
      params.code ||
      params.user ||
      ""
    );
  }, [params]);

  /* ================= STATE ================= */

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD ================= */

  useEffect(() => {
    if (!username) return;

    let alive = true;
    setLoading(true);

    accountService
      .getByUsername(username)
      .then((data) => {
        if (!alive) return;
        setAccount(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [username]);

  /* ================= GUARDS ================= */

  if (!username) {
    return (
      <div style={{ padding: 20 }}>
        Thiếu thông tin tài khoản
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!account) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy tài khoản
      </div>
    );
  }

  if (account.deletedAt) {
    return (
      <div style={{ padding: 20 }}>
        Tài khoản đã bị xoá, không thể chỉnh sửa
      </div>
    );
  }

  /* ================= MAP DATA ================= */

  const initialFormData = {
    username: account.username,
    employeeCode: account.employeeCode,
    department: account.employee?.departmentCode || "",
    position: account.employee?.positionCode || "",
    role: account.role,
    status: account.status,
  };

  /* ================= HANDLER ================= */

  const handleUpdate = async (data) => {
    const payload = { ...data };

    // 🔒 khóa các field không cho sửa
    delete payload.username;
    delete payload.employeeCode;
    delete payload.department;
    delete payload.position;

    try {
      await accountService.update(
        account.username,
        payload
      );
      navigate(`/hrm/tai-khoan/${account.username}`);
    } catch (e) {
      alert("Có lỗi xảy ra khi cập nhật tài khoản");
    }
  };

  /* ================= RENDER ================= */

  return (
    <div style={{ padding: 20 }}>
      <AccountForm
        mode="edit"
        initialData={initialFormData}
        onSubmit={handleUpdate}
        onCancel={() => navigate(-1)}
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
      />
    </div>
  );
}