// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/TimeKeepingEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import TimeKeepingForm from "../../components/layouts/TimeKeepingForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { timeKeepingService } from "../../services/timeKeeping.service";
import { employeeService } from "../../services/employee.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function TimeKeepingEdit() {
  const { id } = useParams();

  const breadcrumbs = useMemo(
    () => [
      { label: "Trang chủ", link: "/" },
      { label: "Nhân sự", link: "/hrm" },
      { label: "Chấm công", link: "/hrm/cham-cong" },
      { label: `Cập nhật #${id}`, active: true },
    ],
    [id]
  );

  // 2. Cập nhật hàm fetcher: Lấy record -> Lấy tên nhân viên -> Gộp lại
  const fetcher = useCallback(async (recordId) => {
    // Gọi API lấy bản ghi chấm công
    const record = await timeKeepingService.getById(recordId);
    
    // Nếu có employeeId, gọi tiếp API nhân viên để lấy tên
    if (record && record.employeeId) {
        try {
            const emp = await employeeService.getById(record.employeeId);
            // Trả về object đã được bổ sung employeeName
            return {
                ...record,
                employeeName: emp ? `${emp.code} - ${emp.name}` : "Nhân viên không tồn tại"
            };
        } catch (error) {
            console.error("Lỗi lấy tên nhân viên:", error);
            return { ...record, employeeName: "Lỗi tải tên" };
        }
    }
    return record;
  }, []);

  const updater = useCallback((recordId, data) => timeKeepingService.update(recordId, data), []);

  const {
    data: timeKeepingData,
    loading,
    submitting,
    isNotFound,
    isDeleted,
    handleUpdate,
    handleCancel,
  } = useEditResource({
    id,
    fetcher,
    updater,
    successPath: "/hrm/cham-cong",
    options: {
      resourceName: "bảng công",
      transformPayload: (formData) => {
        // Loại bỏ các trường hiển thị thừa khi gửi lên server
        const { 
            id, 
            employeeId, 
            employeeName, // Bỏ tên khi update
            employeeCode,
            departmentName,
            workCount, 
            createdAt, 
            updatedAt, 
            ...rest 
        } = formData;
        return rest;
      },
    },
  });

  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin chấm công...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy bản ghi chấm công với ID: <strong>{id}</strong>
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
          Bản ghi chấm công này đã bị xóa hoặc hủy bỏ.
          Bạn cần khôi phục trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={`Cập nhật chấm công #${id}`}
      breadcrumbs={breadcrumbs}
    >
      <TimeKeepingForm
        mode="edit"
        initialData={timeKeepingData}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
      />
    </PageContainer>
  );
}