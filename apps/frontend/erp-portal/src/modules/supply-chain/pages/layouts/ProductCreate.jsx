// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/ProductCreate.jsx

import { useEffect, useState } from "react";
import ProductForm from "../../components/layouts/ProductForm";
import { productService } from "../../services/product.service";
import { categoryService } from "../../services/category.service"; // Giả định service này đã có
import { useCreateResource } from "../../../../shared/hooks/useCreateResource";
import PageContainer from "../../../../shared/components/PageContainer";
import { useToast } from "../../../../shared/components/ToastProvider";

export default function ProductCreate() {
  const [categoryOptions, setCategoryOptions] = useState([]);
  const toast = useToast();

  // 1. Hook xử lý logic Create (Submit, Loading, Redirect)
  const { submitting, handleSubmit, handleCancel } = useCreateResource(
    (data) => productService.create(data),
    "/inventory/products", // Redirect path sau khi tạo thành công
    {
      resourceName: "sản phẩm",
      
      // Map lỗi từ Backend trả về vào field cụ thể (nếu Hook hỗ trợ)
      errorMessages: {
        sku: "Mã SKU này đã tồn tại trong hệ thống",
      },

      onSuccess: () => {
        // Có thể thêm logic phụ nếu cần, ví dụ log tracking
        console.log("Đã tạo xong sản phẩm mới");
      },
    }
  );

  // 2. Fetch dữ liệu bổ trợ (Categories) để nạp vào Dropdown
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // Giả định categoryService trả về danh sách đầy đủ
        const cats = await categoryService.getAll(); 
        
        // Map về định dạng { value, label } cho FormSelect
        const options = (Array.isArray(cats) ? cats : []).map((c) => ({
          value: c.category_id,
          label: c.category_name, // Dùng tên để hiển thị
          // Nếu logic sinh SKU cần mã viết tắt của category, hãy return thêm ở đây
          // code: c.category_code 
        }));
        
        setCategoryOptions(options);
      } catch (error) {
        console.error("Failed to load categories", error);
        toast.error("Không thể tải danh sách danh mục");
      }
    };

    fetchOptions();
  }, [toast]);

  return (
    <PageContainer title="Thêm mới sản phẩm">
      <ProductForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        
        // Props dữ liệu
        categoryOptions={categoryOptions}
        
        // Props trạng thái
        disabled={submitting}
        
        // (Optional) Truyền hàm check tồn tại nếu muốn Validate Real-time tại Form
        // checkSkuExists={productService.checkSkuExists?.bind(productService)}
      />
    </PageContainer>
  );
}