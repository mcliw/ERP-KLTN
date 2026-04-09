package erp.company.accounting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import erp.company.accounting.entity.JournalEntry;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long>, JpaSpecificationExecutor<JournalEntry> {
    // Tìm bút toán theo mã tham chiếu (Reference No - VD: Mã đơn hàng, Mã hóa đơn)
    boolean existsByReferenceNo(String referenceNo);
}