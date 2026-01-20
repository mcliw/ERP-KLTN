// apps/frontend/erp-portal/src/modules/sales/pages/ReceiptDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { receiptService } from "../../services/receipt.service";
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

export default function ReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Fetch dữ liệu chi tiết phiếu thu
  const { data: receipt, loading } = useFetchDetail(receiptService.getById, id);

  if (loading) return <div style={{ padding: 20 }}>Đang tải thông tin phiếu thu...</div>;
  if (!receipt) return <div style={{ padding: 20 }}>Không tìm thấy phiếu thu</div>;

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết phiếu thu"
        onBack={() => navigate("/finance/phieu-thu")}
        actions={!receipt.deleted_at && (
          <EditButton
            label="Chỉnh sửa phiếu"
            onClick={() => navigate(`/finance/phieu-thu/${id}/chinh-sua`)}
          />
        )}
      />

      {/* Top Section: Hiển thị Số phiếu, Ngày chứng từ và Phương thức TT */}
      <DetailTop
        title={`Phiếu thu #${receipt.id}`}
        subtitle={`Ngày tạo: ${formatDate(receipt.created_at)}`}
        // Tận dụng prop status để hiển thị Phương thức thanh toán như một Badge
        status={getPaymentMethodLabel(receipt.payment_method)}
        isDeleted={Boolean(receipt.deleted_at)}
      />

      {/* Section 1: Thông tin tài chính & Định khoản */}
      <DetailSection title="Thông tin tài chính">
        <DetailGrid>
          <DetailItem 
             label="Số tiền thu" 
             value={<span className="font-bold text-primary text-lg" style={{marginLeft: 0}}>{formatCurrency(receipt.amount)}</span>} 
          />
          <DetailItem 
             label="Ngày chứng từ" 
             value={formatDate(receipt.transaction_date || receipt.created_at)} 
          />
          <DetailItem label="Tài khoản Nợ" value={`${receipt.debit_account_code} - ${receipt.debit_account_code === '111' ? 'Tiền mặt' : 'Tiền gửi NH'}`} />
          <DetailItem label="Tài khoản Có" value={`${receipt.credit_account_code} - Phải thu khách hàng`} />
          {receipt.bank_account_number && (
             <DetailItem label="Số tài khoản NH" value={receipt.bank_account_number} />
          )}
        </DetailGrid>
      </DetailSection>

      {/* Section 2: Thông tin tham chiếu */}
      <DetailSection title="Tham chiếu nghiệp vụ">
        <DetailGrid>
          <DetailItem 
            label="Khách hàng" 
            value={
                <div className="flex flex-col">
                    <span
                        className="text-primary" 
                        style={{marginLeft: 0}}
                        onClick={() => navigate(`/sales/khach-hang/${receipt.customer_id}`)}
                    >
                        {receipt.customer_name || receipt.customer_id}
                    </span>
                    {receipt.customer_phone && (
                        <span style={{marginLeft: 0}}> - SĐT: {receipt.customer_phone}</span>
                    )}
                </div>
            } 
          />
          <DetailItem 
            label="Đơn hàng liên quan" 
            value={
                receipt.order_reference_id ? (
                    <span
                        className="text-primary"
                        style={{marginLeft: 0}}
                        onClick={() => navigate(`/sales/don-hang/${receipt.order_reference_id}`)}
                    >
                        {receipt.order_info || `#${receipt.order_reference_id}`}
                    </span>
                ) : "Không có"
            } 
          />
        </DetailGrid>
      </DetailSection>

      {/* Section 3: Diễn giải */}
      <DetailSection title="Nội dung / Diễn giải">
        <div className="profile-item full-width">
           <div className="profile-value">
             {receipt.description ? receipt.description : "Không có diễn giải chi tiết"}
           </div>
        </div>
      </DetailSection>

      {/* Hiển thị thông tin xóa nếu phiếu thu đã bị xóa mềm */}
      {receipt.deleted_at && (
         <DetailSection title="Thông tin hệ thống">
            <DetailGrid>
                <DetailItem 
                  label="Trạng thái" 
                  value={<span className="text-danger">Đã xóa (Soft Deleted)</span>} 
                />
                <DetailItem label="Ngày xóa" value={formatDate(receipt.deleted_at)} />
                <DetailItem label="Cập nhật lần cuối" value={formatDate(receipt.updated_at)} />
            </DetailGrid>
         </DetailSection>
      )}
    </div>
  );
}