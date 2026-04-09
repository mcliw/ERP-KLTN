// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/PositionCreate.jsx

import PositionForm from "../../components/layouts/PositionForm";
import { positionService } from "../../services/position.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function PositionCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => positionService.create(data),
    "/hrm/chuc-vu",
    {
      resourceName: "chức vụ",
      errorMessages: {
        code: "Mã chức vụ đã tồn tại",
      },
      onSuccess: () => {
        console.log("Đã tạo xong chức vụ mới");
      },
    }
  );

  return (
    <PageContainer title="Thêm mới chức vụ">
      <PositionForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting}
        checkCodeExists={positionService.checkCodeExists?.bind(positionService)}
      />
    </PageContainer>
  );
}
