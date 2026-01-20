// apps/frontend/erp-portal/src/modules/supply-chain/pages/ProductCategoryEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import ProductCategoryForm from "../../components/layouts/ProductCategoryForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { productCategoryService } from "../../services/productCategory.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";

export default function ProductCategoryEdit() {
  // Trong Employee dùng 'code', nhưng Category thường dùng 'id' (cat_001)
  const { id } = useParams();

  // 1. Breadcrumbs động
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Supply Chain", link: "/supply-chain" },
    { label: "Danh mục sản phẩm", link: "/supply-chain/danh-muc-san-pham-tai-san" },
    { label: `Cập nhật: ${id}`, active: true },
  ], [id]);

  // 2. Định nghĩa các hàm tương tác Service
  // Sử dụng getById thay vì getByCode
  const fetcher = useCallback((resourceId) => productCategoryService.getById(resourceId), []);
  
  const updater = useCallback((resourceId, data) => productCategoryService.update(resourceId, data), []);

  // 3. Sử dụng Hook chuẩn hóa
  const { 
    data: category, 
    loading, 
    submitting, 
    isNotFound, 
    isDeleted, 
    handleUpdate, 
    handleCancel 
  } = useEditResource({
    id, // Truyền ID lấy từ URL
    fetcher,
    updater,
    successPath: "/supply-chain/danh-muc-san-pham-tai-san",
    options: {
      resourceName: "danh mục",
      // Xử lý payload trước khi gửi API
      transformPayload: (formData) => {
        const { 
          // ID không cần gửi trong body vì đã có trên URL (RESTful chuẩn)
          id: _id, 
          // createdAt, updatedAt thường do server quản lý
          createdAt, 
          updatedAt, 
          deletedAt,
          ...rest 
        } = formData;
        
        // Đảm bảo parentId là null nếu rỗng (để backend hiểu là bỏ quan hệ cha)
        if (rest.parentId === "") rest.parentId = null;

        return rest;
      }
    }
  });

  // 4. Render các trạng thái đặc biệt
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin danh mục...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy danh mục với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  if (isDeleted) {
    return (
      <PageContainer title="Danh mục đã xóa" breadcrumbs={breadcrumbs}>
        <div className="alert alert-warning">
          Danh mục <strong>{category?.name}</strong> đã bị xóa hoặc ngừng hoạt động. 
          Bạn cần khôi phục danh mục trước khi chỉnh sửa.
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // 5. Render Form chính
  return (
    <PageContainer 
      title={`Cập nhật: ${category?.name || id}`} 
      breadcrumbs={breadcrumbs}
    >
      <ProductCategoryForm
        mode="edit"
        initialData={category}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
        // Category thường không cần checkCodeExists khi edit vì ID là cố định
      />
    </PageContainer>
  );
}