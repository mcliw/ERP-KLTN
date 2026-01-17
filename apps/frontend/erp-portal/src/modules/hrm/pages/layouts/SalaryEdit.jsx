// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/SalaryEdit.jsx

import { useMemo, useCallback, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import SalaryForm from "../../components/layouts/SalaryForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { salaryService } from "../../services/salary.service";
import { employeeService } from "../../services/employee.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";
import { useToast } from "../../../../shared/components/ToastProvider";

export default function SalaryEdit() {
  const { id } = useParams(); // Lương dùng ID, không dùng Code
  const toast = useToast();
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // 1. Breadcrumbs
  const breadcrumbs = useMemo(
    () => [
      { label: "Trang chủ", link: "/" },
      { label: "Nhân sự", link: "/hrm" },
      { label: "Quản lý lương", link: "/hrm/quan-ly-luong" },
      { label: `Chi tiết lương #${id}`, active: true },
    ],
    [id]
  );

  // 2. Load danh sách nhân viên (để truyền vào Dropdown trong Form)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getAll({ includeDeleted: false });
        const options = (Array.isArray(data) ? data : []).map((e) => ({
          value: e.id,
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

  // 3. Service functions
  const fetcher = useCallback((salaryId) => salaryService.getById(salaryId, { enrich: true }), []);
  const updater = useCallback((salaryId, data) => salaryService.update(salaryId, data), []);

  // 4. Hook chuẩn hóa
  const {
    data: salaryData,
    loading,
    submitting,
    isNotFound,
    isDeleted,
    handleUpdate,
    handleCancel,
  } = useEditResource({
    id: id,
    fetcher,
    updater,
    successPath: "/hrm/quan-ly-luong",
    options: {
      resourceName: "hợp đồng lương",
      // Loại bỏ các trường enrich hoặc không cần thiết khi gửi lên server update
      transformPayload: (formData) => {
        const { 
          id, 
          employeeName, 
          employeeCode, 
          createdAt, 
          updatedAt, 
          statusLabel,
          ...rest 
        } = formData;
        return rest;
      },
    },
  });

  // 5. Render trạng thái loading/lỗi
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin Lương & Phúc lợi...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy thông tin Lương & Phúc lợi với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Bản ghi đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Thông tin Lương & Phúc lợi của nhân viên <strong>{salaryData?.employeeName}</strong> đã bị xóa.
          Bạn cần khôi phục trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  // 6. Render Form chính
  return (
    <PageContainer
      title={`Cập nhật Lương & Phúc lợi: ${salaryData?.employeeName || "Unknown"}`}
      breadcrumbs={breadcrumbs}
    >
      <SalaryForm
        mode="edit"
        initialData={salaryData}
        employeeOptions={employeeOptions}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}