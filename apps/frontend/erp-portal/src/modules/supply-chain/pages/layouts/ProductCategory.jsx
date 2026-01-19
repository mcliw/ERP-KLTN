// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/ProductCategory.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaPlus } from "react-icons/fa"; // Đổi icon UserPlus -> Plus
import ProductCategoryTable from "../../components/layouts/ProductCategoryTable";
import ProductCategoryFilter from "../../components/layouts/ProductCategoryFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { productCategoryService } from "../../services/productCategory.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

export default function ProductCategory() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Tải toàn bộ dữ liệu danh mục
  const { data: categories, loading, refresh } = useAsyncData(productCategoryService.getAll);

  // 2. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  const [parentId, setParentId] = useState("");
  const [status, setStatus] = useState("");

  // 3. Tạo Map và Options từ dữ liệu đã tải (Client-side processing)
  const { categoryMap, parentOptions } = useMemo(() => {
    const map = {};
    const options = [];

    // Duyệt qua danh sách để tạo Map (ID -> Name) và Option cho Filter
    (categories || []).forEach((cat) => {
      // 1. Map dùng cho Table để hiển thị tên cha
      map[String(cat.id).toUpperCase()] = cat.name;

      // 2. Options dùng cho Filter
      // Chỉ đưa vào filter những category có thể làm cha (tùy logic, ở đây lấy hết)
      options.push({
        value: cat.id,
        label: cat.name
      });
    });

    return { categoryMap: map, parentOptions: options };
  }, [categories]);

  // 4. Logic lọc dữ liệu (Client-side filtering)
  const filteredCategories = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    
    return (categories || []).filter((item) => {
      // Lọc theo từ khóa (Tên hoặc ID)
      const matchKeyword =
        !kw ||
        item.name?.toLowerCase().includes(kw) ||
        String(item.id).toLowerCase().includes(kw);

      // Lọc theo Parent ID
      const matchParent = !parentId || String(item.parentId) === String(parentId);

      // Lọc theo Trạng thái
      const matchStatus = !status || item.status === status;

      return matchKeyword && matchParent && matchStatus;
    });
  }, [categories, keyword, parentId, status]);

  // 5. Phân trang client-side
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredCategories, 10); // Hiển thị 10 dòng mỗi trang

  // 6. Xử lý xóa (Soft delete)
  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${item.name}"?`)) return;

    try {
      await productCategoryService.remove(item.id);
      toast.error(`Đã xoá danh mục "${item.name}"`);
      refresh(); // Tải lại dữ liệu
    } catch (err) {
      toast.error(err?.message || "Không thể xoá danh mục");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setParentId("");
    setStatus("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý danh mục sản phẩm"
        createLabel="Tạo danh mục"
        createIcon={<FaPlus />}
        onCreate={() => navigate("/supply-chain/danh-muc-san-pham-tai-san/them-moi")}
        onRestore={() => navigate("/supply-chain/danh-muc-san-pham-tai-san/khoi-phuc")}
      />

      <ProductCategoryFilter
        keyword={keyword}
        parentId={parentId}
        status={status}
        
        parentOptions={parentOptions}
        statusOptions={[
          { value: "Hoạt động", label: "Hoạt động" },
          { value: "Ngừng hoạt động", label: "Ngừng hoạt động" },
        ]}
        
        onKeywordChange={setKeyword}
        onParentChange={setParentId}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <ProductCategoryTable
        data={paginatedData}
        categoryMap={categoryMap} // Truyền map vào table để hiển thị tên cha
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Điều hướng
        onRowClick={(item) => navigate(`/supply-chain/danh-muc-san-pham-tai-san/${item.id}`)}
        onView={(item) => navigate(`/supply-chain/danh-muc-san-pham-tai-san/${item.id}`)}
        onEdit={(item) => navigate(`/supply-chain/danh-muc-san-pham-tai-san/${item.id}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}