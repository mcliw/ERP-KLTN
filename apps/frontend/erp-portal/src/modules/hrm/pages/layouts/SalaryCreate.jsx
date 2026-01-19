// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/SalaryCreate.jsx

import { useEffect, useState } from "react";
import SalaryForm from "../../components/layouts/SalaryForm";
import { salaryService } from "../../services/salary.service";
import { employeeService } from "../../services/employee.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";
import { useToast } from "../../../../shared/components/ToastProvider";

export default function SalaryCreate() {
  const toast = useToast();
  const [employeeOptions, setEmployeeOptions] = useState([]);
  
  // Hook xử lý tạo mới (submit, redirect, loading...)
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => salaryService.create(data),
    "/hrm/quan-ly-luong", // Đường dẫn quay lại sau khi tạo thành công
    {
      resourceName: "thông tin lương",
      onSuccess: () => {
        // console.log("Đã tạo xong hợp đồng lương");
      },
    }
  );

  // Load danh sách nhân viên khi vào trang để fill vào dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getAll({ includeDeleted: false });
        // Format dữ liệu cho FormSelect: { value, label }
        const options = (Array.isArray(data) ? data : []).map((e) => ({
          value: e.id, // Hoặc e.code tuỳ backend
          label: `${e.name} (${e.code})`,
        }));
        setEmployeeOptions(options);
      } catch (error) {
        console.error("Failed to load employees", error);
        toast.error("Không thể tải danh sách nhân viên.");
      }
    };

    fetchEmployees();
  }, [toast]);

  return (
    <PageContainer title="Thiết lập Lương & Phúc lợi mới">
      <SalaryForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        employeeOptions={employeeOptions} // Truyền options vào form
        disabled={submitting} 
      />
    </PageContainer>
  );
}