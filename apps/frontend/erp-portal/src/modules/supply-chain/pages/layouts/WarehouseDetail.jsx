// apps/frontend/erp-portal/src/modules/supply-chain/pages/WarehouseDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { warehouseService } from "../../services/warehouse.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

// Map hiển thị loại kho sang tiếng Việt
const TYPE_LABELS = {
  CENTRAL: "Kho Trung Tâm",
  LOCAL: "Kho Địa Phương",
  TRANSIT: "Kho Trung Chuyển",
  BONDED: "Kho Ngoại Quan",
  RETAIL: "Cửa Hàng Bán Lẻ",
};

export default function WarehouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Fetch dữ liệu chi tiết
  const { data: warehouse, loading } = useFetchDetail(warehouseService.getById, id);

  if (loading) return <div style={{ padding: 20 }}>Đang tải thông tin kho...</div>;
  if (!warehouse) return <div style={{ padding: 20 }}>Không tìm thấy kho hàng</div>;

  // Helper hiển thị trạng thái từ Boolean
  const statusLabel = warehouse.is_active ? "Hoạt động" : "Ngừng hoạt động";
  const typeLabel = TYPE_LABELS[warehouse.type] || warehouse.type;

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết kho hàng"
        onBack={() => navigate("/supply-chain/kho-hang")}
        // Chỉ hiện nút sửa nếu chưa bị xóa (Soft delete check)
        actions={!warehouse.deletedAt && (
          <EditButton
            label="Chỉnh sửa"
            onClick={() => navigate(`/supply-chain/kho-hang/${id}/chinh-sua`)}
          />
        )}
      />

      {/* Top Section: Hiển thị Tên, Mã và Loại kho */}
      <DetailTop
        title={warehouse.name}
        subtitle={`Mã kho: ${warehouse.code} • ${typeLabel}`}
        status={statusLabel}
        // Lưu ý: JSON warehouse dùng 'deletedAt' (snake_case)
        isDeleted={Boolean(warehouse.deletedAt)}
      />

      <DetailSection title="Thông tin chung">
        <DetailGrid>
          <DetailItem label="ID Hệ thống" value={warehouse.id} />
          <DetailItem label="Mã kho" value={warehouse.code} />
          <DetailItem label="Tên kho" value={warehouse.name} />
          <DetailItem label="Loại hình" value={typeLabel} />
          
          <DetailItem label="Ngày tạo" value={formatDate(warehouse.createdAt)} />
          <DetailItem label="Cập nhật lần cuối" value={formatDate(warehouse.updatedAt)} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Vị trí & Liên hệ">
        {/* Hiển thị full width cho Địa chỉ */}
        <div className="profile-item full-width">
           <div className="profile-label">Địa chỉ</div>
           <div className="profile-value">
             {warehouse.address ? warehouse.address : "—"}
           </div>
        </div>
      </DetailSection>

      {/* Hiển thị thông tin xóa nếu là bản ghi đã xóa mềm */}
      {warehouse.deletedAt && (
         <DetailSection title="Thông tin lưu trữ (Đã xóa)">
            <DetailGrid>
                <DetailItem label="Ngày xóa" value={formatDate(warehouse.deletedAt)} />
                <DetailItem label="Trạng thái lúc xóa" value={warehouse.is_active ? "Đang bật" : "Đang tắt"} />
            </DetailGrid>
         </DetailSection>
      )}
    </div>
  );
}