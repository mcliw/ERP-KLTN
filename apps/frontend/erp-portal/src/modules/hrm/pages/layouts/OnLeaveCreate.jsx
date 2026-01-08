// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/OnLeaveCreate.jsx

import { useNavigate } from "react-router-dom";
import OnLeaveForm from "../../components/layouts/OnLeaveForm";
import { onLeaveService } from "../../services/onLeave.service";
import { useAuthStore } from "../../../../auth/auth.store";

export default function OnLeaveCreate() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleCreate = async (data) => {
    try {
      await onLeaveService.create(data);
    } catch (e) {
      alert("Có lỗi khi tạo đơn nghỉ");
      return;
    }

    navigate("/hrm/nghi-phep");
  };

  return (
    <div style={{ padding: 20 }}>
      <OnLeaveForm
        mode="create"
        currentUser={user}
        onSubmit={handleCreate}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
