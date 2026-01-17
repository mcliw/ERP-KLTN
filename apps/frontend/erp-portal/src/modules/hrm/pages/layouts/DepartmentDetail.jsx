import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { departmentService } from "../../services/department.service";
import { employeeService } from "../../services/employee.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import { formatDate } from "../../../../shared/utils/format";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";
import { 
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton 
} from "../../../../shared/components/DetailLayout";
import "../styles/detail.css";

export default function DepartmentDetail() {
  const { code } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.DEPARTMENT_EDIT);

  // 1. Fetch Department Info
  const { data: department, loading: deptLoading } = useFetchDetail(departmentService.getByCode, code);
  
  // 2. Fetch Employees (Riêng biệt vì logic filter phức tạp)
  const [employees, setEmployees] = useState([]);
  const { positionMap } = useLookupMaps();

  useEffect(() => {
    if (!department) return;
    employeeService.getAll().then(list => {
      const deptEmployees = list.filter(e => 
        !e.deletedAt && e.status === "Đang làm việc" && e.department === department.code
      );
      setEmployees(deptEmployees);
    });
  }, [department]);

  if (deptLoading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!department) return <div style={{ padding: 20 }}>Không tìm thấy phòng ban</div>;

  return (
    <div className="main-detail">
      <DetailHeader 
        title="Chi tiết phòng ban"
        onBack={() => navigate("/hrm/phong-ban")}
        actions={!department.deletedAt && canEdit && (
          <EditButton onClick={() => navigate(`/hrm/phong-ban/${code}/chinh-sua`)} />
        )}
      />

      <DetailTop 
        title={department.name}
        subtitle={department.code}
        status={department.status}
        isDeleted={Boolean(department.deletedAt)}
      />

      <DetailSection title="Thông tin chung">
        <DetailGrid>
          <DetailItem label="Mã phòng ban" value={department.code} />
          <DetailItem label="Tên phòng ban" value={department.name} />
          <DetailItem label="Trưởng phòng" value={department.managerName} />
          <DetailItem label="Mô tả" value={department.description} />
          <DetailItem label="Số lượng nhân viên" value={department.employeeCount} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Nhân viên thuộc phòng ban">
        {employees.length === 0 ? (
          <div>Không có nhân viên đang làm việc</div>
        ) : (
          <table className="main-table">
            <thead>
              <tr>
                <th>Mã NV</th><th>Họ tên</th><th>Chức vụ</th><th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.code}>
                  <td>{e.code}</td>
                  <td>{e.name}</td>
                  <td>
                     {/* Logic hiển thị chức vụ */}
                     {positionMap[e.position] === "Trưởng phòng" ? <strong>{positionMap[e.position]}</strong> : positionMap[e.position] || "—"}
                  </td>
                  <td>{e.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DetailSection>

      <DetailSection title="Trạng thái">
        <DetailGrid>
          <DetailItem label="Ngày tạo" value={formatDate(department.createdAt)} />
          <DetailItem label="Cập nhật lần cuối" value={formatDate(department.updatedAt)} />
        </DetailGrid>
      </DetailSection>
    </div>
  );
}