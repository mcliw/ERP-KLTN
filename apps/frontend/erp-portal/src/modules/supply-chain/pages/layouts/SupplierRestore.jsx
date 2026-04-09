// apps/frontend/erp-portal/src/modules/supply-chain/pages/resources/SupplierRestore.jsx

import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import SupplierTable from "../../components/layouts/SupplierTable";
import { supplierService } from "../../services/supplier.service";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import "../../../../shared/styles/document.css";

export default function SupplierRestore() {
  const navigate = useNavigate();
  
  // Không cần useLookupMaps vì SupplierTable không dùng departmentMap/positionMap

  const { 
    data, loading, page, setPage, totalPages, handleRestore, handleDestroy, goBack 
  } = useRestoreResource(supplierService, "code", "nhà cung cấp");

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Nhà cung cấp đã xoá</h2>
        <button className="btn-secondary" onClick={goBack}>
          <FaArrowLeft style={{ marginRight: 5 }} /> <span>Quay lại</span>
        </button>
      </div>

      <SupplierTable
        data={data}
        // departmentMap={departmentMap} // Bỏ
        // positionMap={positionMap}     // Bỏ
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        onView={(s) => navigate(`/supply-chain/nha-cung-cap/${s.code}`)}
        onEdit={null}   // Không hiển thị nút sửa mặc định
        onDelete={null} // Không hiển thị nút xoá mềm mặc định
        renderExtraActions={(s) => (
          <div style={{ display: "flex", gap: 6 }}>
            <button 
                title="Khôi phục" 
                onClick={() => handleRestore(s)}
                style={{ color: "#059669" }} // Màu xanh lá ám chỉ restore
            >
              <FaUndo />
            </button>
            <button 
                title="Xoá vĩnh viễn" 
                onClick={() => handleDestroy(s)} 
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