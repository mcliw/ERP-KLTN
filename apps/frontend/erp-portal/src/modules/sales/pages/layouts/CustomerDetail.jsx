// apps/frontend/erp-portal/src/modules/sales/pages/CustomerDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { customerService } from "../../services/customer.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Fetch dữ liệu chi tiết khách hàng
  const { data: customer, loading } = useFetchDetail(customerService.getById, id);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!customer) return <div style={{ padding: 20 }}>Không tìm thấy khách hàng</div>;

  return (
    <div className="main-detail">
      <DetailHeader
        title="Hồ sơ khách hàng"
        onBack={() => navigate("/sales/khach-hang")}
        actions={!customer.deleted_at && (
          <EditButton
            label="Chỉnh sửa thông tin"
            onClick={() => navigate(`/sales/khach-hang/${id}/chinh-sua`)}
          />
        )}
      />

      {/* Top Section: Hiển thị Tên khách hàng, Mã khách hàng và Trạng thái */}
      <DetailTop
        title={customer.full_name}
        subtitle={`Mã KH: ${customer.code} • ID Hệ thống: ${customer.id}`}
        status={customer.status}
        isDeleted={Boolean(customer.deleted_at)}
      />

      <DetailSection title="Thông tin liên hệ">
        <DetailGrid>
          <DetailItem label="Họ và tên" value={customer.full_name} />
          <DetailItem label="Mã khách hàng" value={customer.code} />
          <DetailItem label="Số điện thoại" value={customer.phone} />
          <DetailItem label="Địa chỉ Email" value={customer.email} />
          <DetailItem label="Ngày tham gia" value={formatDate(customer.created_at)} />
          <DetailItem label="Cập nhật gần nhất" value={formatDate(customer.updated_at)} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Địa chỉ & Ghi chú">
        <div className="profile-item full-width">
           <div className="profile-label">Địa chỉ chi tiết</div>
           <div className="profile-value">
             {customer.address ? customer.address : "Chưa cập nhật địa chỉ"}
           </div>
        </div>
      </DetailSection>

      {/* Hiển thị thông tin xóa nếu khách hàng đang trong trạng thái lưu trữ */}
      {customer.deleted_at && (
         <DetailSection title="Thông tin hệ thống">
            <DetailGrid>
                <DetailItem 
                  label="Trạng thái" 
                  value={<span className="text-danger">Đã xóa / Ngừng hoạt động</span>} 
                />
                <DetailItem label="Ngày xóa" value={formatDate(customer.deleted_at)} />
            </DetailGrid>
         </DetailSection>
      )}
    </div>
  );
}