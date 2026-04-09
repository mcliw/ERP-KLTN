// apps/frontend/erp-portal/src/modules/finance/pages/PostingRulesDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
// Services
import { postingRulesService } from "../../services/postingRules.service";
import { faAccountService } from "../../services/faAccount.service";
// Hooks & Components
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

// Map phân hệ sang tiếng Việt

const MODULE_LABELS = {
  SUPPLYCHAIN: "Chuỗi cung ứng",
  SALES: "Bán hàng",
  HRM: "Nhân sự",
  GENERAL: "Tổng hợp",
};

export default function PostingRulesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State lưu thông tin tài khoản Nợ/Có sau khi fetch
  const [accountInfo, setAccountInfo] = useState({
    debit: { loading: true, text: "Đang tải..." },
    credit: { loading: true, text: "Đang tải..." },
  });

  // Fetch dữ liệu quy tắc
  const { data: rule, loading } = useFetchDetail(postingRulesService.getById, id);

  // Effect fetch thông tin tài khoản Nợ/Có
  useEffect(() => {
    if (!rule) return;

    // Helper fetch account name
    const fetchAccountName = async (accountId) => {
      if (!accountId) return "—";
      try {
        const acc = await faAccountService.getById(accountId);
        return acc ? `${acc.account_code} - ${acc.account_name}` : `ID: ${accountId} (Không tồn tại)`;
      } catch (err) {
        return "Lỗi tải thông tin";
      }
    };

    // Thực hiện song song
    Promise.all([
      fetchAccountName(rule.debit_account_id),
      fetchAccountName(rule.credit_account_id)
    ]).then(([debitText, creditText]) => {
      setAccountInfo({
        debit: { loading: false, text: debitText },
        credit: { loading: false, text: creditText }
      });
    });

  }, [rule]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải thông tin quy tắc...</div>;
  if (!rule) return <div style={{ padding: 20 }}>Không tìm thấy quy tắc định khoản</div>;

  // Xác định trạng thái
  const isInactive = rule.is_active === false;
  
  // Lấy label phân hệ
  const moduleLabel = MODULE_LABELS[rule.module_source] || rule.module_source;
  
  // Label hiển thị trên Badge (Nếu Inactive thì ưu tiên hiện trạng thái, nếu Active hiện Phân hệ)
  const statusLabel = isInactive ? "Ngừng hoạt động" : moduleLabel;

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết quy tắc định khoản"
        onBack={() => navigate("/finance/dinh-khoan")}
        actions={
          // Chỉ hiển thị nút sửa nếu đang hoạt động
          !isInactive && (
            <EditButton
              label="Chỉnh sửa cấu hình"
              onClick={() => navigate(`/finance/dinh-khoan/${id}/chinh-sua`)}
            />
          )
        }
      />

      {/* Top Section: Mã sự kiện & Diễn giải */}
      <DetailTop
        title={`${rule.event_code}`}
        subtitle={`${rule.event_description}`}
        status={statusLabel}
        isDeleted={isInactive} // Truyền cờ này để DetailTop làm mờ giao diện nếu cần
      />

      <DetailSection title="Cấu hình định khoản (Tự động)">
        <DetailGrid>
          {/* Hàng 1: Thông tin cơ bản */}
          <DetailItem label="Mã sự kiện (Event Code)" value={rule.event_code} />
          <DetailItem label="Phân hệ nguồn" value={moduleLabel} />
          
          {/* Hàng 2: Diễn giải chi tiết */}
          <div className="profile-item full-width">
            <div className="profile-label">Diễn giải nghiệp vụ</div>
            <div className="profile-value">{rule.event_description}</div>
          </div>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Thông tin hạch toán">
        <DetailGrid>
          {/* Hiển thị Nợ / Có nổi bật */}
          <div className="profile-item full-width">
            <div className="profile-label">
                <span style={{ color: "#d9534f", fontWeight: "bold", marginLeft: 0 }}>NỢ (Debit)</span>
            </div>
            <div className="profile-value" style={{ fontSize: "1.1rem" }}>
               {accountInfo.debit.loading ? "..." : accountInfo.debit.text}
            </div>
          </div>

          <div className="profile-item full-width">
            <div className="profile-label">
                <span style={{ color: "#5cb85c", fontWeight: "bold", marginLeft: 0 }}>CÓ (Credit)</span>
            </div>
            <div className="profile-value" style={{ fontSize: "1.1rem" }}>
               {accountInfo.credit.loading ? "..." : accountInfo.credit.text}
            </div>
          </div>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Thông tin hệ thống">
        <DetailGrid>
           {/* Fallback hiển thị ID nếu backend dùng rule_id hoặc id */}
           <DetailItem label="ID Quy tắc" value={rule.rule_id || rule.id} />
           
           {/* Dữ liệu mẫu JSON không có created_at, nếu có thì hiển thị */}
           {rule.created_at && (
             <DetailItem label="Ngày tạo" value={new Date(rule.created_at).toLocaleDateString("vi-VN")} />
           )}
        </DetailGrid>
      </DetailSection>

      {/* Hiển thị vùng cảnh báo nếu đã xóa */}
      {isInactive && (
        <DetailSection title="Trạng thái lưu trữ">
           <DetailGrid>
              <DetailItem 
                 label="Trạng thái" 
                 value={<span className="text-danger">Đã ngừng hoạt động (Inactive)</span>} 
              />
           </DetailGrid>
        </DetailSection>
      )}
    </div>
  );
}