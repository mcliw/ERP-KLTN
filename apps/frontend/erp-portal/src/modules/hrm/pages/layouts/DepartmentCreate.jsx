// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/DepartmentCreate.jsx

import DepartmentForm from "../../components/layouts/DepartmentForm";
import { departmentService } from "../../services/department.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function DepartmentCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => departmentService.create(data),
    "/hrm/phong-ban",
    {
      resourceName: "phòng ban",

      // nếu hook của bạn vẫn dùng errorMessages để map lỗi trùng code
      errorMessages: {
        code: "Mã phòng ban đã tồn tại",
      },

      onSuccess: () => {
        console.log("Đã tạo xong phòng ban mới");
      },
    }
  );

  return (
    <PageContainer title="Thêm mới phòng ban">
      <DepartmentForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting}
        checkCodeExists={departmentService.checkCodeExists?.bind(departmentService)}
      />
    </PageContainer>
  );
}
