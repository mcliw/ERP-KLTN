// apps/frontend/erp-portal/src/modules/supply-chain/pages/layouts/PurchaseRequest.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { FaPlus } from "react-icons/fa";
import PurchaseRequestTable from "../../components/layouts/PurchaseRequestTable";
import PurchaseRequestFilter from "../../components/layouts/PurchaseRequestFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { purchaseRequestService } from "../../services/purchaseRequest.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Nháp" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export default function PurchaseRequest() {
  const navigate = useNavigate();
  const toast = useToast();

  // --- 1. LOAD DATA TỪ SERVICE ---
  const loadData = useCallback(async () => {
    // Gọi song song 3 API, sử dụng hàm đã định nghĩa trong service
    const [prs, emps, depts] = await Promise.all([
      purchaseRequestService.getAll(),          // Port 3002
      purchaseRequestService.getEmployeesRef(), // Port 3001 (Safe fetch)
      purchaseRequestService.getDepartmentsRef()// Port 3001 (Safe fetch)
    ]);
    
    // Nếu emps hoặc depts trả về [] do lỗi HRM, trang web vẫn chạy bình thường
    return { prs, emps, depts };
  }, []);

  const { data, loading, refresh } = useAsyncData(loadData);

  // Destructure an toàn
  const purchaseRequests = data?.prs || [];
  const employees = data?.emps || [];
  const departments = data?.depts || [];

  // --- 2. XỬ LÝ MAP DỮ LIỆU & FILTER ---
  
  const [keyword, setKeyword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");

  const { requesterMap, departmentMap, departmentOptions } = useMemo(() => {
    const rMap = {};
    const dMap = {};
    const dOptions = [];

    employees.forEach(e => { rMap[String(e.id)] = e.name; });
    
    departments.forEach(d => {
      dMap[String(d.id)] = d.name;
      dOptions.push({ value: d.id, label: d.name });
    });

    return { requesterMap: rMap, departmentMap: dMap, departmentOptions: dOptions };
  }, [employees, departments]);

  const filteredData = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return purchaseRequests.filter((item) => {
      const matchKeyword = !kw || item.pr_code?.toLowerCase().includes(kw) || item.reason?.toLowerCase().includes(kw);
      const matchDept = !departmentId || String(item.department_id) === String(departmentId);
      const matchStatus = !status || item.status === status;
      return matchKeyword && matchDept && matchStatus;
    });
  }, [purchaseRequests, keyword, departmentId, status]);

  const { paginatedData, page, totalPages, goToPrev, goToNext } = useClientPagination(filteredData, 10);

  // --- 3. ACTIONS HANDLERS ---

  const handleDelete = async (item) => {
    if (["APPROVED", "COMPLETED"].includes(item.status)) {
        toast.error("Không thể xóa phiếu đã được duyệt hoặc hoàn thành.");
        return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa phiếu "${item.pr_code}"?`)) return;
    
    try {
      await purchaseRequestService.remove(item.id);
      toast.success(`Đã xoá phiếu "${item.pr_code}" thành công`); // Fix: Dùng toast.success
      refresh();
    } catch (err) {
      toast.error(err?.message || "Không thể xoá phiếu");
    }
  };

  const handleEdit = (item) => {
    if (["APPROVED", "COMPLETED", "CANCELLED", "REJECTED"].includes(item.status)) {
      toast.error("Không thể chỉnh sửa phiếu này do trạng thái đã khóa.");
      return;
    }
    navigate(`/supply-chain/yeu-cau-mua-hang/${item.id}/chinh-sua`);
  };

  const handleClearFilter = () => {
    setKeyword("");
    setDepartmentId("");
    setStatus("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý yêu cầu mua hàng"
        createLabel="Tạo yêu cầu"
        createIcon={<FaPlus />}
        onCreate={() => navigate("/supply-chain/yeu-cau-mua-hang/them-moi")}
        onRestore={() => navigate("/supply-chain/yeu-cau-mua-hang/khoi-phuc")}
      />

      <PurchaseRequestFilter
        keyword={keyword}
        departmentId={departmentId}
        status={status}
        departmentOptions={departmentOptions}
        statusOptions={STATUS_OPTIONS}
        onKeywordChange={setKeyword}
        onDepartmentChange={setDepartmentId}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <PurchaseRequestTable
        data={paginatedData}
        requesterMap={requesterMap}
        departmentMap={departmentMap}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        onRowClick={(item) => navigate(`/supply-chain/yeu-cau-mua-hang/${item.id}`)}
        onView={(item) => navigate(`/supply-chain/yeu-cau-mua-hang/${item.id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}