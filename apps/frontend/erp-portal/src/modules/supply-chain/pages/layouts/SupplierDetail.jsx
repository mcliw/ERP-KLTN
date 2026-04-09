// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/SupplierDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supplierService } from "../../services/supplier.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader,
  DetailTop,
  DetailSection,
  DetailGrid,
  DetailItem,
  EditButton,
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

export default function SupplierDetail() {
  const { code } = useParams();
  const navigate = useNavigate();

  // Không cần useLookupMaps vì Supplier không phụ thuộc Department/Position
  const { data: supplier, loading } = useFetchDetail(supplierService.getByCode, code);

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  if (!supplier) return <div style={{ padding: 20 }}>Không tìm thấy nhà cung cấp</div>;

  // Logic hiển thị Subtitle & Rating
  const subTitle = [
    supplier.code,
    supplier.taxCode ? `MST: ${supplier.taxCode}` : "",
  ].filter(Boolean).join(" • ");

  const ratingDisplay = supplier.rating ? `${supplier.rating} / 5 ⭐` : "Chưa có đánh giá";

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết Nhà cung cấp"
        onBack={() => navigate("/supply-chain/nha-cung-cap")}
        actions={!supplier.deletedAt && (
          <EditButton
            label="Chỉnh sửa"
            onClick={() => navigate(`/supply-chain/nha-cung-cap/${code}/chinh-sua`)}
          />
        )}
      />

      <DetailTop
        title={supplier.name}
        subtitle={subTitle}
        status={supplier.status}
        isDeleted={Boolean(supplier.deletedAt)}
        // Nhà cung cấp thường dùng Logo, nếu không có thì để trống hoặc UI sẽ hiện placeholder mặc định
        // avatarUrl={null}
      />

      {/* Cảnh báo nếu Dừng hợp tác nhưng chưa có ngày dừng (Example logic) */}
      {supplier.status === "Dừng hợp tác" && !supplier.stoppedAt && (
        <div className="warning-banner">
          <strong>⚠ Lưu ý</strong>
          <div>Nhà cung cấp này đã dừng hợp tác nhưng chưa cập nhật thời gian dừng cụ thể.</div>
        </div>
      )}

      <DetailSection title="Thông tin chung">
        <DetailGrid>
          <DetailItem label="Mã nhà cung cấp" value={supplier.code} />
          <DetailItem label="Tên doanh nghiệp" value={supplier.name} />
          <DetailItem label="Mã số thuế" value={supplier.taxCode} />
          <DetailItem label="Đánh giá tín nhiệm" value={ratingDisplay} />
          <DetailItem label="ID Đối tác Tài chính" value={supplier.financePartnerId || "—"} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Thông tin liên hệ">
        <DetailGrid>
          <DetailItem label="Email liên hệ" value={supplier.contactEmail} />
          <DetailItem label="Số điện thoại" value={supplier.contactPhone} />
          {/* Address thường dài nên để full width */}
          <div className="profile-item full-width">
             <div className="profile-label">Địa chỉ trụ sở</div>
             <div className="profile-value">{supplier.address}</div>
          </div>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Trạng thái & Ghi chú">
        <DetailGrid>
          <DetailItem label="Ngày bắt đầu" value={formatDate(supplier.createdAt)} />
          <DetailItem label="Ngày dừng hợp tác" value={formatDate(supplier.stoppedAt)} />
          <div className="profile-item full-width">
             <div className="profile-label">Ghi chú nội bộ</div>
             <div className="profile-value" style={{ whiteSpace: "pre-wrap" }}>
                {supplier.note || "—"}
             </div>
          </div>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Hồ sơ pháp lý">
        <DocumentItem label="Hợp đồng hợp tác" url={supplier.contractUrl} />
        {/* Có thể mở rộng thêm nếu sau này có Giấy phép KD */}
      </DetailSection>
    </div>
  );
}

// Sub-component riêng cho PDF (Giữ nguyên logic của EmployeeProfile)
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