// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/ProductEdit.jsx

import { useMemo, useCallback, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ProductForm from "../../components/layouts/ProductForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { productService } from "../../services/product.service";
import { categoryService } from "../../services/category.service"; // Service lấy danh mục
import { useEditResource } from "../../../../shared/hooks/useEditResource";
import { useToast } from "../../../../shared/components/ToastProvider";

export default function ProductEdit() {
  // URL định dạng: /inventory/products/:id (sử dụng product_id làm định danh)
  const { id } = useParams();
  const toast = useToast();
  const [categoryOptions, setCategoryOptions] = useState([]);

  // 1. Fetch dữ liệu bổ trợ (Danh mục) cho Dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await categoryService.getAll();
        const options = (Array.isArray(cats) ? cats : []).map((c) => ({
          value: c.category_id,
          label: c.category_name,
        }));
        setCategoryOptions(options);
      } catch (error) {
        console.error("Lỗi tải danh mục", error);
        toast.error("Không thể tải danh sách danh mục");
      }
    };
    fetchCategories();
  }, [toast]);

  // 2. Breadcrumbs động
  const breadcrumbs = useMemo(
    () => [
      { label: "Trang chủ", link: "/" },
      { label: "Kho vận", link: "/inventory" },
      { label: "Sản phẩm", link: "/inventory/products" },
      { label: `Cập nhật: ${id}`, active: true },
    ],
    [id]
  );

  // 3. Service functions (ổn định dependency)
  const fetcher = useCallback((resourceId) => productService.getById(resourceId, { enrich: true }), []);
  const updater = useCallback((resourceId, data) => productService.update(resourceId, data), []);

  // 4. Hook chuẩn hóa (Lấy dữ liệu chính + Xử lý Update)
  const {
    data: product,
    loading,
    submitting,
    isNotFound,
    // isDeleted, // Bảng products hiện tại chưa có deleted_at, có thể bỏ qua hoặc giữ nếu backend update
    handleUpdate,
    handleCancel,
  } = useEditResource({
    id: id,
    fetcher,
    updater,
    successPath: "/inventory/products",
    options: {
      resourceName: "sản phẩm",
      transformPayload: (formData) => {
        // Loại bỏ các trường không cho phép sửa hoặc trường hệ thống
        const { 
          sku,            // SKU thường không đổi (hoặc logic riêng)
          product_id,     // ID không gửi trong body (đã nằm ở URL)
          created_at, 
          category_name,  // Trường enrich, không lưu DB
          ...rest 
        } = formData;
        
        return rest;
      },
    },
  });

  // 5. Render trạng thái đặc biệt
  if (loading) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-10 text-gray-500">
            <span className="loading-spinner"></span> Đang lấy thông tin sản phẩm...
        </div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          Không tìm thấy sản phẩm với ID: <strong>{id}</strong>
        </div>
        <button className="btn-secondary mt-4" onClick={handleCancel}>
          Quay lại danh sách
        </button>
      </PageContainer>
    );
  }

  // 6. Render Form chính
  return (
    <PageContainer
      title={`Cập nhật: ${product?.product_name || id}`}
      breadcrumbs={breadcrumbs}
    >
      <ProductForm
        mode="edit"
        initialData={product}
        categoryOptions={categoryOptions} // Truyền options danh mục vào
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
        
        // Truyền hàm check SKU nếu cần validate real-time (thường edit thì check SKU trùng với SP KHÁC)
        // checkSkuExists={(sku) => productService.checkSkuExists(sku, id)} 
      />
    </PageContainer>
  );
}