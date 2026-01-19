// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/OnLeaveCreate.jsx

import OnLeaveForm from "../../components/layouts/OnLeaveForm";
import { onLeaveService } from "../../services/onLeave.service";
import { useAuthStore } from "../../../../auth/auth.store";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function OnLeaveCreate() {
  const { user } = useAuthStore();

  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => onLeaveService.create(data),
    "/hrm/nghi-phep",
    {
      resourceName: "đơn nghỉ phép",
      onSuccess: () => {
        console.log("Đã tạo xong đơn nghỉ phép mới");
      },
    }
  );

  return (
    <PageContainer title="Tạo đơn nghỉ phép">
      <OnLeaveForm
        mode="create"
        currentUser={user}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}
