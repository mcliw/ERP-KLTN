package erp.company.accounting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import erp.company.accounting.entity.CashTransaction;
import erp.company.accounting.entity.enums.TransactionType;

import java.util.List;

@Repository
public interface CashTransactionRepository extends JpaRepository<CashTransaction, Long>, JpaSpecificationExecutor<CashTransaction> {

    // 1. Validation: Check trùng mã phiếu (PC001, PT001)
    boolean existsByTransactionCode(String transactionCode);
    
    // 2. Logic tính toán thanh toán:
    // Tìm tất cả các giao dịch liên quan đến một chứng từ gốc (VD: Đơn hàng ID = 100)
    // Dùng để Service tính tổng tiền đã trả/đã thu cho đơn hàng đó.
    List<CashTransaction> findByReferenceDocIdAndTransactionType(Long referenceDocId, TransactionType type);

    // Tìm theo danh sách ID (dùng để load trạng thái cho danh sách đơn hàng)
    List<CashTransaction> findByReferenceDocIdInAndTransactionType(List<Long> referenceDocIds, TransactionType type);
    
    // 3. Tìm transaction code mới nhất để sinh mã tự động (VD: Lấy PC009 để tạo PC010)
    // Lấy giao dịch mới nhất theo loại
    CashTransaction findTopByTransactionTypeOrderByTransactionIdDesc(TransactionType type);
}