// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/AccountCreate.jsx

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AccountForm from "../../components/layouts/AccountForm";
import { accountService } from "../../services/account.service";
import { employeeService } from "../../services/employee.service";

export default function AccountCreate() {
  const navigate = useNavigate();
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // ✅ Load danh sách nhân viên chưa có account
  useEffect(() => {
    Promise.all([
      employeeService.getAll(),
      accountService.getAll(),
    ]).then(([employees, accounts]) => {
      const usedCodes = new Set(
        accounts.map((a) => a.employeeCode)
      );

      const options = employees
        .filter((e) => !usedCodes.has(e.code))
        .map((e) => ({
          value: e.code,
          label: `${e.code} - ${e.name}`,
        }));

      setEmployeeOptions(options);
    });
  }, []);

  const handleCreate = async (data) => {
    try {
      await accountService.create(data);
      navigate("/hrm/tai-khoan");
    } catch (e) {
      if (e?.status === 409 && e?.field === "username") {
        alert("Tên đăng nhập đã tồn tại");
      } else if (e?.status === 409 && e?.field === "employeeCode") {
        alert("Nhân viên này đã có tài khoản");
      } else {
        alert("Có lỗi xảy ra khi tạo tài khoản");
      }
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <AccountForm
        mode="create"
        employeeOptions={employeeOptions}
        roleOptions={[
          { value: "ADMIN", label: "Admin" },
          { value: "HR", label: "HR" },
          { value: "USER", label: "User" },
        ]}
        onSubmit={handleCreate}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
