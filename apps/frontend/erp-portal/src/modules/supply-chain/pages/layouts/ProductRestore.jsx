import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUndo, FaTrash } from "react-icons/fa";
import { useRestoreResource } from "../../../../shared/hooks/useRestoreResource";
import { productService } from "../../services/product.service";
import ProductTable from "../../components/layouts/ProductTable";
import "../../../../shared/styles/document.css";

export default function ProductRestore() {
  const navigate = useNavigate();
  const { data, loading, page, setPage, totalPages, handleRestore, handleDestroy, goBack } = useRestoreResource(productService, "id", "sản phẩm");

  return (
    <div className="main-document">
      <div className="page-header">
         <h2>Sản phẩm đã xóa</h2>
         <button className="btn-secondary" onClick={goBack}><FaArrowLeft /> Quay lại</button>
      </div>
      {loading ? <div>Loading...</div> : (
          <ProductTable data={data} page={page} totalPages={totalPages} 
             onPrev={() => setPage(p => p-1)} onNext={() => setPage(p => p+1)}
             onView={(item) => navigate(`/supply-chain/san-pham-tai-san/${item.id}`)}
             renderExtraActions={(item) => (
                <div style={{display:'flex', gap:8}}>
                   <button className="action-btn restore-btn" onClick={() => handleRestore(item)} title="Khôi phục"><FaUndo /></button>
                   <button className="action-btn destroy-btn" onClick={() => handleDestroy(item)} title="Xóa vĩnh viễn" style={{color:'red'}}><FaTrash /></button>
                </div>
             )}
          />
      )}
    </div>
  );
}