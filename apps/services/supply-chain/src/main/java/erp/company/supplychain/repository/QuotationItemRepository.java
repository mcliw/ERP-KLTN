package erp.company.supplychain.repository;

import erp.company.supplychain.entity.QuotationItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuotationItemRepository extends JpaRepository<QuotationItem, Integer> {
    List<QuotationItem> findByQuotation_QuotationId(Integer quotationId);
}