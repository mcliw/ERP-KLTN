// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/AccountEdit.jsx

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AccountForm from "../../components/layouts/AccountForm";
import { accountService } from "../../services/account.service";

export default function AccountEdit() {
  const params = useParams();
  const navigate = useNavigate();

  // ✅ Bắt username linh hoạt (tránh mismatch tên param trong Router)
  const username = useMemo(() => {
    return (
      params.username ||
      params.id ||
      params.code ||
      params.user ||
      ""
    );
  }, [params]);

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Guard: không gọi service khi chưa có username
    if (!username) return;

    setLoading(true);
    accountService.getByUsername(username).then((data) => {
      setAccount(data);
      setLoading(false);
    });
  }, [username]);

  if (!username) {
    return <div style={{ padding: 20 }}>Thiếu thông tin tài khoản</div>;
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  }

  if (!account) {
    return <div style={{ padding: 20 }}>Không tìm thấy tài khoản</div>;
  }

  const handleUpdate = async (data) => {
    const payload = { ...data };

    // 🔒 khóa username (không cho đổi)
    delete payload.username;
    delete payload.employeeCode;

    try {
      await accountService.update(account.username, payload);
      navigate(`/hrm/tai-khoan/${account.username}`);
    } catch (e) {
      alert("Có lỗi xảy ra khi cập nhật tài khoản");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <AccountForm
        mode="edit"
        initialData={account}
        onSubmit={handleUpdate}
        onCancel={() => navigate(-1)}
        roleOptions={[
          { value: "ADMIN", label: "Admin" },
          { value: "HR", label: "HR" },
          { value: "USER", label: "User" },
        ]}
      />
    </div>
  );
}
