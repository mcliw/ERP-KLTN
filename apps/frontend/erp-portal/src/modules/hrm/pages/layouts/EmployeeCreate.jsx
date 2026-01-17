import EmployeeForm from "../../components/layouts/EmployeeForm";
import { employeeService } from "../../services/employee.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function EmployeeCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => employeeService.create(data),
    "/hrm/ho-so-nhan-vien",
    {
      resourceName: "hồ sơ nhân viên",
      
      transformPayload: (formData) => {
        const { avatarPreview, ...rest } = formData;
        return rest;
      },

      onSuccess: () => {
         console.log("Đã tạo xong nhân viên mới");
      }
    }
  );

  return (
    <PageContainer title="Thêm mới nhân viên">
      <EmployeeForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting}
        checkCodeExists={employeeService.checkCodeExists.bind(employeeService)}
      />
    </PageContainer>
  );
}