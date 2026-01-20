// apps/frontend/erp-portal/src/modules/sales/pages/VoucherDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { voucherService } from "../../services/voucher.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

// Helper format tiền tệ
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "---";
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function VoucherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Fetch dữ liệu chi tiết voucher (đã bao gồm details và constraints từ service)
  const { data: voucher, loading } = useFetchDetail(voucherService.getById, id);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!voucher) return <div style={{ padding: 20 }}>Không tìm thấy mã giảm giá</div>;

  // --- Pre-process Data ---
  // Lấy thông tin từ các bảng con
  const detail = voucher.voucher_details?.[0] || {};
  const constraint = voucher.voucher_constraints?.[0] || {};
  
  const isPercentage = voucher.discount_type === "PERCENTAGE";
  const displayValue = isPercentage ? `${voucher.discount_value}%` : formatCurrency(voucher.discount_value);
  const displayType = isPercentage ? "Giảm theo phần trăm" : "Giảm số tiền cố định";

  // Tiêu đề hiển thị (Mã code)
  const codeTitle = detail.code || `Voucher #${voucher.id}`;

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết mã giảm giá"
        onBack={() => navigate("/sales/ma-giam-gia")}
        actions={!voucher.deleted_at && (
          <EditButton
            label="Chỉnh sửa cấu hình"
            onClick={() => navigate(`/sales/ma-giam-gia/${id}/chinh-sua`)}
          />
        )}
      />

      {/* Top Section: Hiển thị Mã Code to rõ và Loại giảm giá */}
      <DetailTop
        title={codeTitle}
        subtitle={`${displayType} • ID Hệ thống: ${voucher.id}`}
        status={voucher.status} // Service đã map is_active -> status
        isDeleted={Boolean(voucher.deleted_at)}
      />

      {/* Section 1: Cấu hình giảm giá */}
      <DetailSection title="Thông tin cấu hình">
        <DetailGrid>
          <DetailItem label="Mã Voucher (Code)" value={<strong>{codeTitle}</strong>} />
          <DetailItem label="Loại giảm giá" value={displayType} />
          
          <DetailItem 
            label="Giá trị giảm" 
            value={<span className="text-primary font-bold" style={{ fontSize: '1.1em' }}>{displayValue}</span>} 
          />
          
          <DetailItem label="Ngày tạo" value={formatDate(voucher.created_at)} />
          <DetailItem label="Cập nhật gần nhất" value={formatDate(voucher.updated_at)} />
        </DetailGrid>
      </DetailSection>

      {/* Section 2: Điều kiện áp dụng */}
      <DetailSection title="Điều kiện áp dụng">
        <DetailGrid>
           <DetailItem 
             label="Đơn hàng tối thiểu" 
             value={constraint.min_order_amount ? formatCurrency(constraint.min_order_amount) : "Không giới hạn"} 
           />
           
           <DetailItem 
             label="Mức giảm tối đa" 
             value={
               isPercentage 
                 ? (constraint.max_discount_amount ? formatCurrency(constraint.max_discount_amount) : "Không giới hạn")
                 : "Theo giá trị giảm cố định"
             } 
           />
        </DetailGrid>
        
        {/* Nếu cần hiển thị ghi chú hoặc mô tả thêm (nếu DB có trường description) */}
        {/* <div className="profile-item full-width">
           <div className="profile-label">Ghi chú</div>
           <div className="profile-value">...</div>
        </div> 
        */}
      </DetailSection>

      {/* Hiển thị thông tin xóa nếu voucher đã bị hủy */}
      {voucher.deleted_at && (
         <DetailSection title="Thông tin hệ thống">
            <DetailGrid>
                <DetailItem 
                  label="Trạng thái" 
                  value={<span className="text-danger">Đã xóa / Ngừng hoạt động</span>} 
                />
                <DetailItem label="Ngày xóa" value={formatDate(voucher.deleted_at)} />
            </DetailGrid>
         </DetailSection>
      )}
    </div>
  );
}