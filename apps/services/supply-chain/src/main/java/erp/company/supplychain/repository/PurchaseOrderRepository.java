package erp.company.supplychain.repository;

import erp.company.supplychain.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Integer>, JpaSpecificationExecutor<PurchaseOrder> {

    // Validation
    boolean existsByPoCode(String poCode);
    
    // Tìm PO theo mã (dùng cho Goods Receipt nhập kho)
    Optional<PurchaseOrder> findByPoCode(String poCode);
    
    // Tìm PO được tạo ra từ Báo giá nào
    Optional<PurchaseOrder> findByQuotation_QuotationId(Integer quotationId);
}