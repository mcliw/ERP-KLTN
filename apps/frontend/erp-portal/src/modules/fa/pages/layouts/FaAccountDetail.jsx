// apps/frontend/erp-portal/src/modules/finance/pages/FaAccountDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { faAccountService } from "../../services/faAccount.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

// Map hiển thị loại tài khoản sang tiếng Việt
const TYPE_LABELS = {
  ASSET: "Tài sản",
  LIABILITY: "Nợ phải trả",
  EQUITY: "Vốn chủ sở hữu",
  REVENUE: "Doanh thu",
  EXPENSE: "Chi phí",
};

// Thêm nhãn vào phần constants
const BALANCE_SIDE_LABELS = {
  DEBIT: "Dư Nợ",
  CREDIT: "Dư Có",
  BOTH: "Lưỡng tính",
};

export default function FaAccountDetail() {
  // JSON sử dụng 'account_id' làm khóa chính, URL dạng /:id
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State lưu thông tin tài khoản cha
  const [parentInfo, setParentInfo] = useState("—");

  // Fetch dữ liệu chi tiết
  const { data: account, loading } = useFetchDetail(faAccountService.getById, id);

  // Effect để lấy tên tài khoản cha khi có account data
  useEffect(() => {
    if (!account) return;

    if (!account.parent_account_id) {
      setParentInfo("Tài khoản cấp 1 (Gốc)");
      return;
    }

    // Gọi service để lấy thông tin cha
    faAccountService.getById(account.parent_account_id)
      .then((parent) => {
        // Hiển thị format: [Mã] - [Tên]
        setParentInfo(parent ? `${parent.account_code} - ${parent.account_name}` : "Không tìm thấy");
      })
      .catch(() => setParentInfo("Lỗi tải thông tin cha"));
  }, [account]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải thông tin tài khoản...</div>;
  if (!account) return <div style={{ padding: 20 }}>Không tìm thấy tài khoản</div>;

  // Xác định trạng thái hiển thị
  const isActive = account.is_active === true;
  const statusLabel = isActive ? "Hoạt động" : "Ngừng hoạt động";
  const typeLabel = TYPE_LABELS[account.account_type] || account.account_type;

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết tài khoản"
        onBack={() => navigate("/finance/he-thong-tai-khoan")}
        actions={isActive && (
          <EditButton
            label="Chỉnh sửa"
            onClick={() => navigate(`/finance/he-thong-tai-khoan/${id}/chinh-sua`)}
          />
        )}
      />

      {/* Top Section: Hiển thị Mã + Tên TK nổi bật */}
      <DetailTop
        title={`${account.account_code} - ${account.account_name}`}
        subtitle={`Loại: ${typeLabel} • ID Hệ thống: ${account.id}`}
        status={statusLabel}
        isDeleted={!isActive} // Styling màu xám/đỏ nếu inactive
      />

      <DetailSection title="Thông tin chung">
        <DetailGrid>
          <DetailItem label="Số hiệu tài khoản" value={account.account_code} />
          <DetailItem label="Tên tài khoản" value={account.account_name} />
          <DetailItem label="Loại tài khoản" value={typeLabel} />

          <DetailItem label="Tài khoản cha" value={parentInfo} />
          <DetailItem 
            label="Tính chất tài khoản" 
            value={BALANCE_SIDE_LABELS[account.balance_side] || "—"} 
          />
          <DetailItem label="Ngày tạo" value={formatDate(account.created_at)} />
          
          {/* Nếu JSON có updated_at thì hiển thị, không thì ẩn */}
          {account.updated_at && (
             <DetailItem label="Cập nhật lần cuối" value={formatDate(account.updated_at)} />
          )}
        </DetailGrid>
      </DetailSection>

      {/* Logic hiển thị thêm nếu cần (VD: Description, nhưng JSON mẫu không có description cho COA) */}
      {/* <DetailSection title="Mô tả & Ghi chú">
         <div className="profile-item full-width">
            <div className="profile-label">Diễn giải</div>
            <div className="profile-value">
              {account.description || "—"}
            </div>
         </div>
      </DetailSection> 
      */}

      {/* Hiển thị thông tin ngừng hoạt động nếu có */}
      {!isActive && (
         <DetailSection title="Trạng thái lưu trữ">
            <DetailGrid>
               <DetailItem 
                  label="Trạng thái" 
                  value={<span className="text-danger">Đã ngừng hoạt động (Inactive)</span>} 
               />
               {/* Nếu có logic xóa mềm có deleted_at thì thêm vào đây */}
            </DetailGrid>
         </DetailSection>
      )}
    </div>
  );
}