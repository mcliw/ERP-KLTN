// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/SalaryRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import SalaryTable from "../../components/layouts/SalaryTable";
import { salaryService } from "../../services/salary.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../../../../shared/styles/document.css";

export default function SalaryRestore() {
  const navigate = useNavigate();

  const {
    data,
    loading,
    page,
    setPage,
    totalPages,
    handleRestore,
    handleDestroy,
    goBack,
  } = useRestoreResource(
    salaryService, 
    "id", // Lưu ý: Lương dùng ID làm khoá chính, không dùng Code
    "hợp đồng lương"
  );

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Thông tin Lương & Phúc lợi đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <SalaryTable
        data={data}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        // Điều hướng đến trang chi tiết (dùng ID)
        onView={(d) => navigate(`/hrm/quan-ly-luong/${d.id}`)}
        // Tắt các action sửa/xoá mặc định
        onEdit={null}
        onDelete={null}
        // Render nút thao tác đặc biệt cho trang khôi phục
        renderExtraActions={(d) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button 
              className="btn-icon" 
              title="Khôi phục" 
              onClick={() => handleRestore(d)}
            >
              <FaUndo className="text-primary" />
            </button>
            <button
              className="btn-icon"
              title="Xoá vĩnh viễn"
              onClick={() => handleDestroy(d)}
            >
              <FaTrash className="text-danger" />
            </button>
          </div>
        )}
      />
    </div>
  );
}