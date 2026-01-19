import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaPlus } from "react-icons/fa";
import PageHeader from "../../../../shared/components/PageHeader";
import ProductTable from "../../components/layouts/ProductTable";
import ProductFilter from "../../components/layouts/ProductFilter";
import { productService } from "../../services/product.service";
import { productCategoryService } from "../../services/productCategory.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";

export default function ProductList() {
  const navigate = useNavigate();
  const toast = useToast();
  
  // Load Products & Categories
  const { data: products, refresh } = useAsyncData(productService.getAll);
  const { data: categories } = useAsyncData(productCategoryService.getAll);

  const [filter, setFilter] = useState({ keyword: "", categoryId: "", type: "", status: "" });

  // Map & Options (ĐÃ FIX LỖI REFERENCE ERROR)
  const { categoryMap, categoryOptions } = useMemo(() => {
    const map = {}; // Biến local map
    const opts = [];
    (categories || []).forEach(c => {
        map[c.id] = c.name;
        opts.push({ value: c.id, label: c.name });
    });
    
    // Return đúng tên key: value (map)
    return { categoryMap: map, categoryOptions: opts }; 
  }, [categories]);

  // Filtering
  const filteredData = useMemo(() => {
    return (products || []).filter(p => {
        const kw = filter.keyword.toLowerCase();
        const matchKw = !kw || p.name.toLowerCase().includes(kw) || String(p.code).toLowerCase().includes(kw);
        const matchCat = !filter.categoryId || p.categoryId === filter.categoryId;
        const matchType = !filter.type || p.type === filter.type;
        const matchStatus = !filter.status || p.status === filter.status;
        return matchKw && matchCat && matchType && matchStatus;
    });
  }, [products, filter]);

  const { paginatedData, page, totalPages, goToPrev, goToNext } = useClientPagination(filteredData, 10);

  const handleDelete = async (item) => {
    if(window.confirm(`Xóa sản phẩm ${item.name}?`)) {
        await productService.remove(item.id);
        toast.error(`Đã xóa sản phẩm ${item.name}`);
        refresh();
    }
  };

  return (
    <div className="main-document">
      <PageHeader title="Sản phẩm & Tài sản" createLabel="Thêm mới" createIcon={<FaPlus />}
        onCreate={() => navigate("/supply-chain/san-pham-tai-san/them-moi")}
        onRestore={() => navigate("/supply-chain/san-pham-tai-san/khoi-phuc")}
      />
      
      <ProductFilter 
        {...filter}
        categoryOptions={categoryOptions}
        onKeywordChange={v => setFilter(p => ({...p, keyword: v}))}
        onCategoryChange={v => setFilter(p => ({...p, categoryId: v}))}
        onTypeChange={v => setFilter(p => ({...p, type: v}))}
        onStatusChange={v => setFilter(p => ({...p, status: v}))}
        onClear={() => setFilter({ keyword: "", categoryId: "", type: "", status: "" })}
      />

      <ProductTable 
        data={paginatedData} categoryMap={categoryMap}
        page={page} totalPages={totalPages} onPrev={goToPrev} onNext={goToNext}
        onRowClick={(item) => navigate(`/supply-chain/san-pham-tai-san/${item.id}`)}
        onView={item => navigate(`/supply-chain/san-pham-tai-san/${item.id}`)}
        onEdit={item => navigate(`/supply-chain/san-pham-tai-san/${item.id}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}