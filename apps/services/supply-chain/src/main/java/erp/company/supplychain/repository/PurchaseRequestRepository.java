package erp.company.supplychain.repository;

import erp.company.supplychain.entity.PurchaseRequest;
import erp.company.supplychain.entity.enums.PrStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseRequestRepository extends JpaRepository<PurchaseRequest, Integer>, JpaSpecificationExecutor<PurchaseRequest> {

    // Validation: Check trùng mã phiếu
    boolean existsByPrCode(String prCode);

    // Dropdown/Process: Lấy danh sách PR đã duyệt để làm báo giá (QuotationForm)
    List<PurchaseRequest> findByStatus(PrStatus status);
    
    // Filter nhanh theo người yêu cầu
    List<PurchaseRequest> findByRequesterId(Integer requesterId);
}