// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/Product.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback, useEffect } from "react";
import ProductTable from "../../components/layouts/ProductTable";
import ProductFilter from "../../components/layouts/ProductFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { productService } from "../../services/product.service";
import { categoryService } from "../../services/category.service"; // Service lấy danh mục
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useAuthStore } from "../../../../auth/auth.store";
// Giả định bạn có permissions file cho Inventory
// import { INVENTORY_PERMISSIONS } from "../../../../shared/permissions/inventory.permissions";
import { hasPermission } from "../../../../shared/utils/permission";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../styles/document.css";
import "../../../../shared/styles/button.css";

/* =========================
 * Helpers
 * ========================= */
const normalizeText = (v) => String(v || "").trim().toLowerCase();

const PRODUCT_TYPE_OPTIONS = [
  { value: "trading_goods", label: "Hàng hóa kinh doanh" },
  { value: "company_asset", label: "Tài sản công ty" },
];

export default function Product() {
  const navigate = useNavigate();
  const toast = useToast();

  const user = useAuthStore((s) => s.user);
  // Logic check quyền (Giả định)
  // const canEdit = hasPermission(user?.role, INVENTORY_PERMISSIONS.PRODUCT_UPDATE);
  const canEdit = true; 

  // 1. Load danh sách sản phẩm
  const { data: products, loading, refresh } = useAsyncData(productService.getAll);

  // 2. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productType, setProductType] = useState("");
  
  // State danh sách danh mục để nạp vào filter
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Fetch Category Options lúc mount
  useEffect(() => {
    categoryService.getAll().then((cats) => {
      const options = (Array.isArray(cats) ? cats : []).map((c) => ({
        value: c.category_id,
        label: c.category_name,
      }));
      setCategoryOptions(options);
    }).catch(err => console.error("Lỗi tải danh mục:", err));
  }, []);

  // 3. Logic lọc dữ liệu (Client-side filtering)
  const filteredProducts = useMemo(() => {
    const kw = normalizeText(keyword);

    return products.filter((p) => {
      // Lọc theo từ khóa (SKU, Tên, Thương hiệu)
      const matchKeyword =
        !kw ||
        normalizeText(p.product_name).includes(kw) ||
        normalizeText(p.sku).includes(kw) ||
        normalizeText(p.brand).includes(kw);

      // Lọc theo Danh mục
      const matchCategory = !categoryId || String(p.category_id) === String(categoryId);

      // Lọc theo Loại sản phẩm
      const matchType = !productType || p.product_type === productType;

      return matchKeyword && matchCategory && matchType;
    });
  }, [products, keyword, categoryId, productType]);

  // 4. Phân trang
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredProducts, 10); // 10 items per page

  // Các handlers
  const handleClearFilter = useCallback(() => {
    setKeyword("");
    setCategoryId("");
    setProductType("");
  }, []);

  const handleDelete = useCallback(
    async (product) => {
      // Logic chặn xoá nếu cần (VD: Tồn kho > 0)
      if (product.current_stock > 0) {
        toast.info("Không thể xoá sản phẩm vì đang còn tồn kho.");
        return;
      }

      if (!window.confirm(`Bạn có chắc chắn muốn xoá sản phẩm "${product.product_name}"?`)) return;

      try {
        await productService.delete(product.product_id);
        toast.success(`Đã xoá sản phẩm "${product.sku}"`);
        refresh();
      } catch (err) {
        toast.error(err?.message || "Không thể xoá sản phẩm");
      }
    },
    [refresh, toast]
  );

  if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Đang tải dữ liệu...</div>;

  return (
    <div className="main-document">
      {/* Header */}
      <PageHeader
        title="Quản lý sản phẩm"
        createLabel="Thêm sản phẩm"
        onCreate={canEdit ? () => navigate("/inventory/products/create") : null}
        onRestore={canEdit ? () => navigate("/inventory/products/restore") : null}
      />

      {/* Filter Bar */}
      <ProductFilter
        keyword={keyword}
        categoryId={categoryId}
        productType={productType}
        
        categoryOptions={categoryOptions}
        typeOptions={PRODUCT_TYPE_OPTIONS}
        
        onKeywordChange={setKeyword}
        onCategoryChange={setCategoryId}
        onTypeChange={setProductType}
        onClear={handleClearFilter}
      />

      {/* Main Table */}
      <ProductTable
        data={paginatedData}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Actions
        onRowClick={(d) => navigate(`/inventory/products/${d.product_id}`)}
        onView={(d) => navigate(`/inventory/products/${d.product_id}`)}
        onEdit={canEdit ? (d) => navigate(`/inventory/products/${d.product_id}/edit`) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />
    </div>
  );
}