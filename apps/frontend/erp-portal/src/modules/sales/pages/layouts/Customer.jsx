// apps/frontend/erp-portal/src/modules/sales/pages/layouts/Customer.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaPlus } from "react-icons/fa"; 
import CustomerTable from "../../components/layouts/CustomerTable";
import CustomerFilter from "../../components/layouts/CustomerFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { customerService } from "../../services/customer.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

export default function Customer() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Tải toàn bộ dữ liệu khách hàng
  const { data: customers, loading, refresh } = useAsyncData(customerService.getAll);

  // 2. State cho bộ lọc
  const [keyword, setKeyword] = useState("");
  // Đã bỏ parentId vì khách hàng không phân cấp
  const [status, setStatus] = useState("");

  // 3. Logic lọc dữ liệu (Client-side filtering)
  const filteredCustomers = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    
    return (customers || []).filter((item) => {
      // Lọc theo từ khóa (Mã, Tên, SĐT, Email)
      const matchKeyword =
        !kw ||
        item.full_name?.toLowerCase().includes(kw) ||
        item.code?.toLowerCase().includes(kw) ||
        item.email?.toLowerCase().includes(kw) ||
        item.phone?.includes(kw); // SĐT thường tìm chính xác chuỗi số

      // Lọc theo Trạng thái
      const matchStatus = !status || item.status === status;

      return matchKeyword && matchStatus;
    });
  }, [customers, keyword, status]);

  // 4. Phân trang client-side
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredCustomers, 10); // Hiển thị 10 dòng mỗi trang

  // 5. Xử lý xóa (Soft delete)
  const handleDelete = async (item) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khách hàng "${item.full_name}"?`)) return;

    try {
      await customerService.remove(item.id);
      toast.error(`Đã xoá khách hàng "${item.full_name}"`);
      refresh(); // Tải lại dữ liệu
    } catch (err) {
      toast.error(err?.message || "Không thể xoá khách hàng");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setStatus("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý khách hàng"
        createLabel="Thêm khách hàng"
        createIcon={<FaPlus />}
        // Cập nhật đường dẫn theo module sales
        onCreate={() => navigate("/sales/khach-hang/them-moi")}
        onRestore={() => navigate("/sales/khach-hang/khoi-phuc")}
      />

      <CustomerFilter
        keyword={keyword}
        status={status}
        
        // Status option khớp với Schema/Service
        statusOptions={[
          { value: "ACTIVE", label: "Hoạt động (Active)" },
          { value: "INACTIVE", label: "Ngừng hoạt động (Inactive)" },
        ]}
        
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <CustomerTable
        data={paginatedData}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        // Điều hướng
        onRowClick={(item) => navigate(`/sales/khach-hang/${item.id}`)}
        onView={(item) => navigate(`/sales/khach-hang/${item.id}`)}
        onEdit={(item) => navigate(`/sales/khach-hang/${item.id}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}