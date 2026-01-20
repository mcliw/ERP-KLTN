package erp.company.supplychain.repository;

import erp.company.supplychain.entity.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Integer>, JpaSpecificationExecutor<Quotation> {

    // Validation
    boolean existsByQuotationCode(String quotationCode);

    // Logic: Lấy danh sách báo giá theo PR để so sánh giá
    List<Quotation> findByPurchaseRequest_PrId(Integer prId);

    // Dropdown: Lấy báo giá đã được duyệt hoặc được chọn để tạo PO (PurchaseOrderForm)
    // Query này lấy status = APPROVED HOẶC isSelected = true
    @Query("SELECT q FROM Quotation q WHERE q.status = 'APPROVED' OR q.isSelected = true")
    List<Quotation> findAvailableForPo();
    
    // Tìm báo giá của 1 nhà cung cấp cụ thể
    List<Quotation> findBySupplier_SupplierId(Integer supplierId);
}