// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/TimeKeepingRestore.jsx

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import TimeKeepingTable from "../../components/layouts/TimeKeepingTable";
import { timeKeepingService } from "../../services/timeKeeping.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../styles/document.css";

export default function TimeKeepingRestore() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Hàm fetch dữ liệu (giữ nguyên)
  const fetchRestoreData = useCallback(async () => {
    const allData = await timeKeepingService.getAll({ includeDeleted: true });
    // Lấy bản ghi đã Xóa (deletedAt) HOẶC Đã hủy (status = "Đã hủy")
    return allData.filter((d) => d.deletedAt || d.status === "Đã hủy");
  }, []);

  const { data, loading, refresh } = useAsyncData(fetchRestoreData);

  // === 2. Xử lý Khôi phục với window.confirm ===
  const handleRestore = useCallback(
    async (item) => {
      // Tạo nội dung thông báo tùy theo trạng thái
      const message = item.status === "Đã hủy"
        ? `Bạn có chắc muốn bỏ trạng thái "Hủy công" cho nhân viên ${item.employeeName}?`
        : `Khôi phục chấm công của nhân viên "${item.employeeName}"?`;

      // Hiện popup mặc định của trình duyệt
      if (!window.confirm(message)) return;

      try {
        await timeKeepingService.restore(item.id);
        
        toast.success(
            item.status === "Đã hủy" 
            ? "Đã khôi phục trạng thái làm việc" 
            : "Đã khôi phục bản ghi thành công"
        );
        refresh();
      } catch (error) {
        toast.error("Lỗi khi khôi phục");
      }
    },
    [refresh, toast]
  );

  // === 3. Xử lý Xóa vĩnh viễn ===
  const handleDestroy = useCallback(
    async (item) => {
      if (!window.confirm(`CẢNH BÁO: Bạn có chắc muốn xóa vĩnh viễn bản ghi của ${item.employeeName}? Hành động này không thể hoàn tác.`)) 
        return;

      try {
        await timeKeepingService.destroy(item.id);
        toast.success("Đã xóa vĩnh viễn");
        refresh();
      } catch (error) {
        toast.error("Lỗi khi xóa");
      }
    },
    [refresh, toast]
  );

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;

  return (
    <div className="main-document">
      <div className="page-header d-flex align-items-center justify-content-between mb-3">
        <div>
            <h2 className="mb-0">Thùng rác & Công đã hủy</h2>
            <p className="text-muted small mb-0">Khôi phục các bản ghi đã xóa hoặc đã bị hủy</p>
        </div>
        <button className="btn btn-secondary d-flex align-items-center gap-2" onClick={() => navigate("/hrm/cham-cong")}>
          <FaArrowLeft /> Quay lại danh sách
        </button>
      </div>

      <TimeKeepingTable
        data={data}
        onView={(d) => navigate(`/hrm/cham-cong/${d.id}`)}
        onEdit={null}
        onDelete={null}
        renderExtraActions={(d) => (
          <div style={{ display: "flex", gap: 10 }}>
            {/* Nút Khôi phục */}
            <button 
                title="Khôi phục" 
                onClick={(e) => { e.stopPropagation(); handleRestore(d); }}
            >
              <FaUndo />
            </button>

            {/* Nút Xóa vĩnh viễn */}
            <button
              title="Xoá vĩnh viễn"
              onClick={(e) => { e.stopPropagation(); handleDestroy(d); }}
              style={{ color: "#dc2626" }}
            >
              <FaTrash />
            </button>
          </div>
        )}
      />
      
      {data && data.length === 0 && (
        <div className="text-center py-5 text-muted">Thùng rác trống</div>
      )}
    </div>
  );
}