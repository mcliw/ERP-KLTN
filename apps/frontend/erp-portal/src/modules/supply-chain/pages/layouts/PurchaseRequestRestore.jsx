import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import PurchaseRequestTable from "../../components/layouts/PurchaseRequestTable";
import { purchaseRequestService } from "../../services/purchaseRequest.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { useToast } from "../../../../shared/components/ToastProvider"; // Thêm toast để báo lỗi nếu cần
import "../../../../shared/styles/document.css";

export default function PurchaseRequestRestore() {
  const navigate = useNavigate();
  const toast = useToast();

  // State lưu map ID -> Name (Lấy từ API thực tế)
  const [refMaps, setRefMaps] = useState({
    requesterMap: {},
    departmentMap: {}
  });

  // --- 1. TẠO ADAPTER ĐỂ LẤY DỮ LIỆU ĐÃ XÓA ---
  // Hook useRestoreResource thường gọi .getAll(). Ta cần "đánh tráo" hàm này 
  // để nó tự động lấy danh sách "đã xóa" (deletedAt != null) từ API thật.
  const restoreServiceAdapter = useMemo(() => {
    return {
      ...purchaseRequestService,
      getAll: async () => {
        try {
          // Gọi hàm getAll thật với tham số lấy cả item đã xóa
          const allData = await purchaseRequestService.getAll({ includeDeleted: true });
          // Lọc phía Client: chỉ lấy các bản ghi có deletedAt
          return allData.filter(item => item.deletedAt);
        } catch (error) {
          console.error("Lỗi khi tải danh sách khôi phục:", error);
          return [];
        }
      }
    };
  }, []);

  // --- 2. SỬ DỤNG HOOK RESOURCE VỚI ADAPTER ---
  const { 
    data, loading, page, setPage, totalPages, handleRestore, handleDestroy, goBack 
  } = useRestoreResource(
    restoreServiceAdapter, // Truyền service đã chỉnh sửa vào đây
    "id", 
    "phiếu yêu cầu"
  );

  // --- 3. LOAD DỮ LIỆU THAM CHIẾU TỪ API THẬT ---
  useEffect(() => {
    let mounted = true;

    const fetchReferenceData = async () => {
      try {
        // Gọi song song API lấy Departments (Port 3001) và Employees (Port 3001)
        const [depts, emps] = await Promise.all([
          purchaseRequestService.getDepartmentsRef(),
          purchaseRequestService.getEmployeesRef()
        ]);

        if (mounted) {
          const dMap = {};
          const rMap = {};

          // Map dữ liệu thật vào object
          (Array.isArray(depts) ? depts : []).forEach(d => {
            dMap[String(d.id)] = d.name;
          });
          
          (Array.isArray(emps) ? emps : []).forEach(e => {
            rMap[String(e.id)] = e.name;
          });

          setRefMaps({ requesterMap: rMap, departmentMap: dMap });
        }
      } catch (err) {
        console.error("Failed to load reference data from HRM service", err);
        // Không chặn UI nếu lỗi reference, chỉ log warning
      }
    };

    fetchReferenceData();

    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Đang tải danh sách đã xóa...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Khôi phục yêu cầu mua hàng</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <PurchaseRequestTable
        data={data}
        // Truyền map dữ liệu thật để hiển thị tên thay vì ID
        requesterMap={refMaps.requesterMap}
        departmentMap={refMaps.departmentMap}
        
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        
        // Actions
        onView={(item) => navigate(`/supply-chain/yeu-cau-mua-hang/${item.id}`)}
        onEdit={null} // Không cho sửa khi đang ở thùng rác
        onDelete={null} // Không hiển thị nút xóa mềm
        
        // Custom Action Buttons: Khôi phục & Xóa vĩnh viễn
        renderExtraActions={(item) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button 
                title="Khôi phục phiếu này" 
                className="action-btn restore-btn"
                onClick={() => handleRestore(item)}
            >
              <FaUndo />
            </button>
            
            <button 
                title="Xoá vĩnh viễn (Không thể hoàn tác)" 
                className="action-btn destroy-btn"
                onClick={() => handleDestroy(item)} 
                style={{ color: "#dc2626" }}
            >
              <FaTrash />
            </button>
          </div>
        )}
      />
    </div>
  );
}