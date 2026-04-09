// apps/frontend/erp-portal/src/modules/finance/pages/PaymentSlipDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { paymentSlipService } from "../../services/paymentSlip.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

// Helper format tiền tệ
const formatCurrency = (value) => {
  if (!value) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

// Helper dịch phương thức thanh toán
const getPaymentMethodLabel = (method) => {
  const map = {
    CASH: "Tiền mặt",
    BANK_TRANSFER: "Chuyển khoản",
  };
  return map[method] || method;
};

export default function PaymentSlipDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Fetch dữ liệu chi tiết (đã được enrich tên NCC và PO từ service)
  const { data: slip, loading } = useFetchDetail(paymentSlipService.getById, id);

  if (loading) return <div style={{ padding: 20 }}>Đang tải thông tin phiếu chi...</div>;
  if (!slip) return <div style={{ padding: 20 }}>Không tìm thấy phiếu chi</div>;

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết phiếu chi"
        onBack={() => navigate("/finance/phieu-chi")}
        actions={!slip.deleted_at && (
          <EditButton
            label="Chỉnh sửa phiếu"
            onClick={() => navigate(`/finance/phieu-chi/${id}/chinh-sua`)}
          />
        )}
      />

      {/* Top Section */}
      <DetailTop
        title={`Phiếu chi #${slip.id}`}
        subtitle={`Ngày tạo: ${formatDate(slip.created_at)}`}
        // Hiển thị phương thức như Badge
        status={getPaymentMethodLabel(slip.payment_method)}
        isDeleted={Boolean(slip.deleted_at)}
      />

      {/* Section 1: Thông tin tài chính */}
      <DetailSection title="Thông tin tài chính">
        <DetailGrid>
          <DetailItem 
             label="Số tiền chi" 
             // Màu đỏ/cam để biểu thị dòng tiền ra
             value={<span className="font-bold text-danger text-lg" style={{marginLeft: 0}}>{formatCurrency(slip.amount)}</span>} 
          />
          <DetailItem 
             label="Ngày chứng từ" 
             value={formatDate(slip.transaction_date || slip.created_at)} 
          />
          <DetailItem 
             label="Tài khoản Nợ" 
             value={`${slip.debit_account_code} - Phải trả người bán`} 
          />
          <DetailItem 
             label="Tài khoản Có" 
             value={`${slip.credit_account_code} - ${slip.credit_account_code === '111' ? 'Tiền mặt' : 'Tiền gửi NH'}`} 
          />
          {/* Chỉ hiển thị nếu có số tài khoản */}
          {slip.bank_account_number && (
             <DetailItem label="Tài khoản thụ hưởng" value={slip.bank_account_number} />
          )}
        </DetailGrid>
      </DetailSection>

      {/* Section 2: Tham chiếu nghiệp vụ (NCC & POs) */}
      <DetailSection title="Tham chiếu nghiệp vụ">
        <DetailGrid>
          {/* Link đến Nhà cung cấp */}
          <DetailItem 
            label="Nhà cung cấp" 
            value={
                <div className="flex flex-col">
                    <span 
                        className="text-primary"
                        style={{marginLeft: 0}}
                        onClick={() => navigate(`/supply-chain/nha-cung-cap/${slip.supplier_code}`)}
                    >
                        {slip.supplier_name || slip.supplier_code}
                    </span>
                    {slip.supplier_code && (
                        <span className="text-primary">Mã: {slip.supplier_code}</span>
                    )}
                </div>
            } 
          />
          
          {/* Danh sách Đơn mua hàng (PO) */}
          <DetailItem 
            label="Đơn mua hàng (PO)" 
            value={
                slip.purchase_orders_info && slip.purchase_orders_info.length > 0 ? (
                    <div className="flex flex-col gap-2 mt-1">
                        {slip.purchase_orders_info.map((po) => (
                            <div 
                                key={po.id} 
                                className="text-primary"
                                onClick={() => navigate(`/supply-chain/don-mua-hang/${po.id}`)}
                            >
                                <span className="font-medium text-link group-hover:underline" style={{marginLeft: 0}}>
                                    #{po.code || po.id}
                                </span>
                                {po.total && (
                                    <span className="text-xs text-gray-500">
                                        ({formatCurrency(po.total)})
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className="text-gray-400">Không có tham chiếu</span>
                )
            } 
          />
        </DetailGrid>
      </DetailSection>

      {/* Section 3: Diễn giải */}
      <DetailSection title="Nội dung / Diễn giải">
        <div className="profile-item full-width">
           <div className="profile-value">
             {slip.description ? slip.description : "Không có diễn giải chi tiết"}
           </div>
        </div>
      </DetailSection>

      {/* Thông tin hệ thống */}
      {slip.deleted_at && (
         <DetailSection title="Thông tin hệ thống">
            <DetailGrid>
                <DetailItem 
                  label="Trạng thái" 
                  value={<span className="text-danger">Đã xóa (Soft Deleted)</span>} 
                />
                <DetailItem label="Ngày xóa" value={formatDate(slip.deleted_at)} />
                <DetailItem label="Cập nhật lần cuối" value={formatDate(slip.updated_at)} />
            </DetailGrid>
         </DetailSection>
      )}
    </div>
  );
}