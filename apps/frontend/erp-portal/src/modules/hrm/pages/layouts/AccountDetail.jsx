import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { accountService } from "../../services/account.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import { 
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton 
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

export default function AccountDetail() {
  const params = useParams();
  const navigate = useNavigate();

  // Logic lấy username linh hoạt
  const username = useMemo(() => params.username || params.id || "", [params]);

  const { data: account, loading } = useFetchDetail(accountService.getByUsername, username);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!account) return <div style={{ padding: 20 }}>Không tìm thấy tài khoản</div>;

  const emp = account.employee || {};
  const isDeleted = Boolean(account.deletedAt);

  return (
    <div className="main-detail">
      <DetailHeader 
        title="Chi tiết tài khoản"
        onBack={() => navigate("/hrm/tai-khoan")}
        actions={!isDeleted && (
          <EditButton onClick={() => navigate(`/hrm/tai-khoan/${account.username}/chinh-sua`)} />
        )}
      />

      <DetailTop 
        title={emp.name || account.username}
        subtitle={account.username}
        status={account.status}
        isDeleted={isDeleted}
      />

      <DetailSection title="Thông tin tài khoản">
        <DetailGrid>
          <DetailItem label="Tên đăng nhập" value={account.username} />
          <DetailItem label="Họ tên" value={emp.name} />
          <DetailItem label="Email" value={emp.email} />
          <DetailItem label="Vai trò" value={account.role} />
          <DetailItem label="Phòng ban" value={emp.departmentName} />
          <DetailItem label="Chức vụ" value={emp.positionName} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Trạng thái">
        <DetailGrid>
          <DetailItem label="Trạng thái" value={account.status} />
          <DetailItem label="Ngày tạo" value={formatDate(account.createdAt)} />
          <DetailItem label="Cập nhật lần cuối" value={formatDate(account.updatedAt)} />
        </DetailGrid>
      </DetailSection>
    </div>
  );
}