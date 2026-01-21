package erp.company.accounting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import erp.company.accounting.entity.PostingRule;

@Repository
public interface PostingRuleRepository extends JpaRepository<PostingRule, Integer>, JpaSpecificationExecutor<PostingRule> {

    // 1. Validation: Check trùng Event Code
    boolean existsByEventCode(String eventCode);
    boolean existsByEventCodeAndRuleIdNot(String eventCode, Integer ruleId);

    // 2. Query đặc biệt cho Filter: Tìm rule có dính líu đến accountId (bất kể là Nợ hay Có)
    // Logic này thường được xử lý trong Specification, nhưng nếu viết @Query trực tiếp:
    @Query("SELECT p FROM PostingRule p WHERE (:accountId IS NULL OR p.debitAccount.accountId = :accountId OR p.creditAccount.accountId = :accountId)")
    // Lưu ý: Đây là ví dụ query, thực tế ta sẽ dùng Specification trong Service để kết hợp với keyword search.
    // Interface này kế thừa JpaSpecificationExecutor nên Service có thể build dynamic query dễ dàng.
    void findByAccountInvolved(); // Placeholder logic
}