// apps/frontend/erp-portal/src/modules/supply-chain/pages/ProductCategoryDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { productCategoryService } from "../../services/productCategory.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

export default function ProductCategoryDetail() {
  // Sử dụng 'id' thay vì 'code'
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State lưu tên danh mục cha
  const [parentName, setParentName] = useState("—");

  // Fetch dữ liệu chi tiết
  const { data: category, loading } = useFetchDetail(productCategoryService.getById, id);

  // Effect để lấy tên danh mục cha khi có category data
  useEffect(() => {
    if (!category) return;

    if (!category.parentId) {
      setParentName("Danh mục gốc");
      return;
    }

    // Gọi service để lấy tên cha (hoặc có thể dùng hook useLookupMaps nếu đã cấu hình cho supply chain)
    productCategoryService.getById(category.parentId)
      .then((parent) => setParentName(parent?.name || "Không tìm thấy"))
      .catch(() => setParentName("Lỗi tải thông tin"));
  }, [category]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!category) return <div style={{ padding: 20 }}>Không tìm thấy danh mục</div>;

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết danh mục"
        onBack={() => navigate("/supply-chain/danh-muc-san-pham-tai-san")}
        actions={!category.deletedAt && (
          <EditButton
            label="Chỉnh sửa"
            onClick={() => navigate(`/supply-chain/danh-muc-san-pham-tai-san/${id}/chinh-sua`)}
          />
        )}
      />

      {/* Top Section: Không có Avatar, hiển thị Tên và ID */}
      <DetailTop
        title={category.name}
        subtitle={`ID: ${category.id} • ${parentName}`}
        status={category.status}
        isDeleted={Boolean(category.deletedAt)}
      />

      <DetailSection title="Thông tin chung">
        <DetailGrid>
          <DetailItem label="Mã danh mục" value={category.id} />
          <DetailItem label="Tên danh mục" value={category.name} />
          <DetailItem label="Danh mục cha" value={parentName} />
          <DetailItem label="Ngày tạo" value={formatDate(category.createdAt)} />
          <DetailItem label="Cập nhật lần cuối" value={formatDate(category.updatedAt)} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Mô tả & Ghi chú">
        {/* Hiển thị full width cho description */}
        <div className="profile-item full-width">
           <div className="profile-label">Mô tả chi tiết</div>
           <div className="profile-value">
             {category.description ? category.description : "—"}
           </div>
        </div>
      </DetailSection>

      {/* Nếu cần debug hoặc hiển thị thông tin hệ thống */}
      {category.deletedAt && (
         <DetailSection title="Thông tin lưu trữ">
            <DetailGrid>
                <DetailItem label="Ngày xóa" value={formatDate(category.deletedAt)} />
            </DetailGrid>
         </DetailSection>
      )}
    </div>
  );
}