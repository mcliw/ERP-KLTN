// apps/frontend/erp-portal/src/modules/supply-chain/pages/BinDetail.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { binService } from "../../services/bin.service";
import { warehouseService } from "../../services/warehouse.service"; // Import để lấy tên kho
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

export default function BinDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State quản lý dữ liệu
  const [bin, setBin] = useState(null);
  const [warehouseName, setWarehouseName] = useState("Đang tải...");
  const [loading, setLoading] = useState(true);

  // Fetch dữ liệu (Cần lấy cả Bin và tên Kho tương ứng)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Lấy thông tin Bin
        const binData = await binService.getById(id);
        
        if (binData) {
            setBin(binData);
            
            // 2. Nếu Bin tồn tại, lấy thông tin Kho để hiển thị tên
            if (binData.warehouse_id) {
                const warehouseData = await warehouseService.getById(binData.warehouse_id);
                setWarehouseName(warehouseData ? warehouseData.name : "Kho không xác định");
            } else {
                setWarehouseName("—");
            }
        }
      } catch (error) {
        console.error("Lỗi tải chi tiết vị trí:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải thông tin vị trí...</div>;
  if (!bin) return <div style={{ padding: 20 }}>Không tìm thấy vị trí lưu kho</div>;

  // Helper hiển thị trạng thái (Bin chỉ có trạng thái xóa hoặc tồn tại)
  const isDeleted = Boolean(bin.deletedAt);
  let statusLabel = "Không xác định";
  
  if (isDeleted) {
      statusLabel = "Đã xóa";
  } else {
      statusLabel = bin.is_active ? "Hoạt động" : "Ngừng hoạt động";
  }

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết vị trí kho"
        onBack={() => navigate("/supply-chain/vi-tri-kho")}
        // Chỉ hiện nút sửa nếu chưa bị xóa
        actions={!isDeleted && (
          <EditButton
            label="Chỉnh sửa"
            onClick={() => navigate(`/supply-chain/vi-tri-kho/${id}/chinh-sua`)}
          />
        )}
      />

      {/* Top Section: Hiển thị Mã vị trí làm tiêu đề chính */}
      <DetailTop
        title={bin.code}
        subtitle={`Thuộc: ${warehouseName}`}
        status={statusLabel}
        isDeleted={isDeleted}
        // Icon hoặc màu sắc có thể tùy biến thêm tại đây
      />

      <DetailSection title="Thông tin chung">
        <DetailGrid>
          <DetailItem label="ID Hệ thống" value={bin.id} />
          <DetailItem label="Mã vị trí" value={bin.code} />
          
          {/* Hiển thị tên kho thay vì ID */}
          <DetailItem label="Kho hàng" value={warehouseName} />
          
          {/* Format số sức chứa */}
          <DetailItem 
            label="Sức chứa tối đa" 
            value={bin.max_capacity ? `${bin.max_capacity.toLocaleString()} items` : "Không giới hạn"} 
          />

          <DetailItem 
            label="Trạng thái" 
            value={bin.is_active ? "Cho phép lưu kho" : "Tạm ngưng sử dụng"} 
          />
          
          <DetailItem label="Ngày tạo" value={formatDate(bin.createdAt)} />
          <DetailItem label="Cập nhật lần cuối" value={formatDate(bin.updatedAt)} />
        </DetailGrid>
      </DetailSection>

      {/* Section mô tả (nếu có) */}
      {bin.description && (
        <DetailSection title="Ghi chú / Mô tả">
           <div className="profile-item full-width">
             <div className="profile-value">{bin.description}</div>
           </div>
        </DetailSection>
      )}

      {/* Hiển thị thông tin xóa nếu là bản ghi đã xóa mềm */}
      {isDeleted && (
         <DetailSection title="Thông tin lưu trữ (Đã xóa)">
            <DetailGrid>
                <DetailItem label="Ngày xóa" value={formatDate(bin.deletedAt)} />
                <DetailItem label="Trạng thái" value="Không khả dụng" />
            </DetailGrid>
         </DetailSection>
      )}
    </div>
  );
}