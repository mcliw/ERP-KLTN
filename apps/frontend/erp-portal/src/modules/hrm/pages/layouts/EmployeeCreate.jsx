import React from "react";
import EmployeeForm from "../../components/layouts/EmployeeForm";
import { employeeService } from "../../services/employee.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function EmployeeCreate() {
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => employeeService.create(data),
    "/hrm/ho-so-nhan-vien", // Redirect về danh sách sau khi tạo xong
    {
      resourceName: "hồ sơ nhân viên",
      // Transform payload: Loại bỏ các trường thừa nếu cần
      transformPayload: (formData) => {
        const { avatarPreview, ...rest } = formData;
        // Đảm bảo department/position gửi lên là String Code (IT, DEV...)
        return rest;
      },
      onSuccess: () => {
         console.log("Tạo nhân viên thành công");
      }
    }
  );

  return (
    <PageContainer 
      title="Thêm mới hồ sơ nhân viên" 
      breadcrumbs={[
        { label: "Nhân sự", to: "/hrm/ho-so-nhan-vien" },
        { label: "Thêm mới", active: true }
      ]}
    >
      <EmployeeForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={submitting}
        checkCodeExists={employeeService.checkCodeExists?.bind(employeeService)}
      />
    </PageContainer>
  );
}