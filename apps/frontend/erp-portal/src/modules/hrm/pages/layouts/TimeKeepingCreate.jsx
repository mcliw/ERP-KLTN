// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/TimeKeepingCreate.jsx

import { useState, useEffect } from "react";
import TimeKeepingForm from "../../components/layouts/TimeKeepingForm";
import { timeKeepingService } from "../../services/timeKeeping.service";
import { employeeService } from "../../services/employee.service";
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";

export default function TimeKeepingCreate() {
  const [employees, setEmployees] = useState([]);

  // 1. Load danh sách nhân viên để chọn trong Form
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Chỉ lấy nhân viên đang hoạt động (không lấy đã xóa)
        const data = await employeeService.getAll({ includeDeleted: false });
        setEmployees(data || []);
      } catch (error) {
        console.error("Lỗi khi tải danh sách nhân viên:", error);
      }
    };
    fetchEmployees();
  }, []);

  // 2. Sử dụng Hook tạo mới resource
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => timeKeepingService.create(data),
    "/hrm/cham-cong", // Đường dẫn quay về sau khi tạo xong
    {
      resourceName: "bảng công",
      
      // Map thông báo lỗi từ Service (nếu Service throw error có key trùng)
      errorMessages: {
        exists: "Nhân viên này đã có dữ liệu chấm công trong ngày này",
      },

      onSuccess: () => {
        console.log("Đã chấm công thành công");
      },
    }
  );

  return (
    <PageContainer title="Thêm mới chấm công">
      <TimeKeepingForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        employeeOptions={employees} // Truyền list nhân viên vào form
        disabled={submitting}
      />
    </PageContainer>
  );
}