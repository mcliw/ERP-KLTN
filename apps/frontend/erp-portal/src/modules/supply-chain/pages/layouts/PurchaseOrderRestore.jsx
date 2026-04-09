// apps/frontend/erp-portal/src/modules/supply-chain/pages/PurchaseOrderRestore.jsx

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import PurchaseOrderTable from "../../components/layouts/PurchaseOrderTable";
import { purchaseOrderService } from "../../services/purchaseOrder.service";
import { quotationService } from "../../services/quotation.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { useToast } from "../../../../shared/components/ToastProvider";
import "../../../../shared/styles/document.css";

export default function PurchaseOrderRestore() {
  const navigate = useNavigate();
  const toast = useToast();

  // State lưu map ID -> Label để hiển thị trên Table
  const [refMaps, setRefMaps] = useState({
    supplierMap: {},
    quotationMap: {}
  });

  // --- 1. TẠO ADAPTER ĐỂ LẤY DỮ LIỆU PO ĐÃ XÓA ---
  const restoreServiceAdapter = useMemo(() => {
    return {
      ...purchaseOrderService,
      getAll: async () => {
        try {
          // Lấy toàn bộ PO bao gồm cả bản ghi đã xóa mềm
          const allData = await purchaseOrderService.getAll({ includeDeleted: true });
          
          // Lọc chỉ lấy các bản ghi có deletedAt (đã bị xóa tạm thời)
          return allData.filter(item => item.deletedAt);
        } catch (error) {
          console.error("Lỗi khi tải danh sách PO khôi phục:", error);
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
    "đơn mua hàng"
  );

  // --- 3. LOAD DỮ LIỆU THAM CHIẾU (SUPPLIER & QUOTATION) ---
  useEffect(() => {
    let mounted = true;

    const fetchReferenceData = async () => {
      try {
        const [suppliers, quotations] = await Promise.all([
          quotationService.getSuppliersRef(),
          quotationService.getAll() // Lấy Quotations để map rfq_code
        ]);

        if (mounted) {
          const sMap = {};
          const qMap = {};

          // Map Supplier ID -> Name
          (Array.isArray(suppliers) ? suppliers : []).forEach(s => {
            sMap[String(s.id)] = s.name;
          });
          
          // Map Quotation ID -> RFQ Code
          (Array.isArray(quotations) ? quotations : []).forEach(q => {
            qMap[String(q.id)] = q.rfq_code;
          });

          setRefMaps({ supplierMap: sMap, quotationMap: qMap });
        }
      } catch (err) {
        console.error("Failed to load reference data for PO Restore", err);
      }
    };

    fetchReferenceData();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-4">Đang tải danh sách đơn hàng đã xóa...</div>;

  return (
    <div className="main-document">
      <div className="page-header d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Khôi phục Đơn mua hàng</h2>
          <p className="text-muted small">Danh sách các đơn hàng đã bị xóa tạm thời</p>
        </div>
        <button className="btn btn-secondary" onClick={goBack}>
          <FaArrowLeft className="mr-2" /> <span>Quay lại</span>
        </button>
      </div>

      <PurchaseOrderTable
        data={data}
        supplierMap={refMaps.supplierMap}
        quotationMap={refMaps.quotationMap}
        
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        
        // Chỉ cho phép Xem chi tiết, không cho phép Sửa/Xóa thông thường trong thùng rác
        onView={(item) => navigate(`/supply-chain/don-mua-hang/${item.id}`)}
        onEdit={null} 
        onDelete={null} 
        
        // Custom Action Buttons: Khôi phục & Xóa vĩnh viễn
        renderExtraActions={(item) => (
          <div className="d-flex" style={{ display: 'flex', gap: 6 }}>
            <button 
                title="Khôi phục đơn hàng này" 
                className="btn btn-sm btn-outline-success"
                onClick={(e) => {
                    e.stopPropagation();
                    handleRestore(item);
                }}
            >
              <FaUndo />
            </button>
            
            <button 
                title="Xoá vĩnh viễn (Không thể hoàn tác)" 
                className="btn btn-sm btn-outline-danger"
                onClick={(e) => {
                    e.stopPropagation();
                    handleDestroy(item);
                }} 
            >
              <FaTrash />
            </button>
          </div>
        )}
      />
    </div>
  );
}