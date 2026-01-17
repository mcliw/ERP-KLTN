// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/EmployeeProfile.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { employeeService } from "../../services/employee.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../styles/detail.css";

export default function EmployeeProfile() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { departmentMap, positionMap } = useLookupMaps();

  const { data: employee, loading } = useFetchDetail(employeeService.getByCode, code);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!employee) return <div style={{ padding: 20 }}>Không tìm thấy nhân viên</div>;

  const departmentName = departmentMap[employee.department] || employee.department || "—";
  const positionName = positionMap[employee.position] || employee.position || "—";
  const missingAssignment = employee.status === "Đang làm việc" && (!employee.department || !employee.position);

  return (
    <div className="main-detail">
      <DetailHeader
        title="Hồ sơ nhân viên"
        onBack={() => navigate("/hrm/ho-so-nhan-vien")}
        actions={!employee.deletedAt && (
          <EditButton
            label="Chỉnh sửa"
            onClick={() => navigate(`/hrm/ho-so-nhan-vien/${code}/chinh-sua`)}
          />
        )}
      />

      <DetailTop
        title={employee.name}
        subtitle={`${employee.code} • ${departmentName} • ${positionName}`}
        status={employee.status}
        isDeleted={Boolean(employee.deletedAt)}
        avatarUrl={employee.avatarUrl}
      />

      {missingAssignment && (
        <div className="warning-banner">
          <strong>⚠ Nhân viên chưa được phân công</strong>
          <div>Cần cập nhật phòng ban/chức vụ cho nhân viên này.</div>
          <button className="btn-warning" onClick={() => navigate(`/hrm/ho-so-nhan-vien/${code}/chinh-sua`)}>
            Phân công ngay
          </button>
        </div>
      )}

      <DetailSection title="Thông tin cá nhân">
        <DetailGrid>
          <DetailItem label="Mã nhân viên" value={employee.code} />
          <DetailItem label="Họ tên" value={employee.name} />
          <DetailItem label="Giới tính" value={employee.gender} />
          <DetailItem label="Ngày sinh" value={formatDate(employee.dob)} />
          <DetailItem label="Quê quán" value={employee.hometown} />
          <DetailItem label="Số CCCD" value={employee.cccd} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Thông tin liên hệ">
        <DetailGrid>
          <DetailItem label="Email" value={employee.email} />
          <DetailItem label="Số điện thoại" value={employee.phone} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Thông tin công việc">
        <DetailGrid>
          <DetailItem label="Phòng ban" value={departmentName} />
          <DetailItem label="Chức vụ" value={positionName} />
          <DetailItem label="Ngày vào làm" value={formatDate(employee.joinDate)} />
          <DetailItem label="Ngày nghỉ việc" value={formatDate(employee.resignedAt)} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Thông tin tài chính">
        <DetailGrid>
          <DetailItem label="Ngân hàng" value={employee.bankAccountName} />
          <DetailItem label="Số tài khoản" value={employee.bankAccount} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Hồ sơ giấy tờ">
        <DocumentItem label="Hợp đồng" url={employee.contractUrl} />
        <DocumentItem label="CV" url={employee.cvUrl} />
        <DocumentItem label="Giấy khám sức khỏe" url={employee.healthCertUrl} />
        <DocumentItem label="Bằng cấp / Chứng chỉ" url={employee.degreeUrl} />
      </DetailSection>
    </div>
  );
}

// Sub-component riêng cho PDF
function DocumentItem({ label, url }) {
  const [open, setOpen] = useState(false);
  if (!url) return <DetailItem label={label} value="—" />;

  const isBase64 = String(url).startsWith("data:");

  return (
    <div className="profile-item full-width">
      <div className="profile-label">{label}</div>
      <div className="profile-value">
        <button className="btn-link" onClick={() => setOpen(!open)}>
          {open ? "Ẩn PDF" : "Xem PDF"}
        </button>

        {open && (
          <div className="pdf-preview">
            {isBase64 ? (
              <embed src={url} type="application/pdf" width="100%" height="500px" />
            ) : (
              <iframe src={url} title={label} width="100%" height="500px" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
