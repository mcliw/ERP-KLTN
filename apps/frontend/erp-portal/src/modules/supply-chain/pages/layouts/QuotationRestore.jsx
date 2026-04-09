// apps/frontend/erp-portal/src/modules/supply-chain/pages/QuotationRestore.jsx

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import QuotationTable from "../../components/layouts/QuotationTable";
import { quotationService } from "../../services/quotation.service";
import { purchaseRequestService } from "../../services/purchaseRequest.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";

export default function QuotationRestore() {
  const navigate = useNavigate();
  const toast = useToast();

  // State lưu map ID -> Name
  const [refMaps, setRefMaps] = useState({
    supplierMap: {},
    prMap: {}
  });

  // --- 1. TẠO ADAPTER ĐỂ LẤY DỮ LIỆU ĐÃ XÓA ---
  // Override hàm getAll để lấy danh sách deletedAt != null
  const restoreServiceAdapter = useMemo(() => {
    return {
      ...quotationService,
      getAll: async () => {
        try {
          // Gọi hàm getAll với tham số includeDeleted
          const allData = await quotationService.getAll({ includeDeleted: true });
          
          // Lọc phía Client: chỉ lấy các bản ghi có deletedAt
          // (Lưu ý: Logic này phụ thuộc vào backend, nếu backend đã lọc thì không cần filter lại, 
          // nhưng để an toàn theo mẫu PR, ta filter ở đây)
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
    restoreServiceAdapter, 
    "id", 
    "báo giá"
  );

  // --- 3. LOAD DỮ LIỆU THAM CHIẾU TỪ API THẬT ---
  useEffect(() => {
    let mounted = true;

    const fetchReferenceData = async () => {
      try {
        // Load danh sách NCC và PR để map tên
        const [suppliers, prs] = await Promise.all([
          quotationService.getSuppliersRef(),
          purchaseRequestService.getAll() // Lấy PR để map Code
        ]);

        if (mounted) {
          const sMap = {};
          const pMap = {};

          // Map Supplier ID -> Name
          (Array.isArray(suppliers) ? suppliers : []).forEach(s => {
            sMap[String(s.id)] = s.name;
          });
          
          // Map PR ID -> PR Code
          (Array.isArray(prs) ? prs : []).forEach(p => {
            pMap[String(p.id)] = p.pr_code;
          });

          setRefMaps({ supplierMap: sMap, prMap: pMap });
        }
      } catch (err) {
        console.error("Failed to load reference data", err);
      }
    };

    fetchReferenceData();

    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Đang tải danh sách đã xóa...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Khôi phục Báo giá nhà cung cấp</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <QuotationTable
        data={data}
        // Truyền map dữ liệu thật
        supplierMap={refMaps.supplierMap}
        prMap={refMaps.prMap}
        
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        
        // Actions: Chỉ cho Xem (View)
        onView={(item) => navigate(`/supply-chain/bao-gia/${item.id}`)}
        onEdit={null} 
        onDelete={null} 
        
        // Custom Action Buttons: Khôi phục & Xóa vĩnh viễn
        renderExtraActions={(item) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button 
                title="Khôi phục báo giá này" 
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