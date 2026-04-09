package erp.company.accounting.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import erp.company.accounting.dto.PostingRuleDTO;
import erp.company.accounting.entity.PostingRule;
import erp.company.accounting.entity.enums.ModuleSource;

public interface PostingRuleService {

    // 1. Phục vụ Table & Filter (Search keyword, module, account related, status)
    Page<PostingRule> getPostingRules(String keyword, ModuleSource module, Integer accountId, Boolean isActive, Pageable pageable);

    // 2. Phục vụ Form (Get Detail)
    PostingRuleDTO getRuleById(Integer id);

    // 3. Phục vụ Form (Create)
    PostingRule createRule(PostingRuleDTO dto);

    // 4. Phục vụ Form (Update)
    PostingRule updateRule(Integer id, PostingRuleDTO dto);

    // 5. Phục vụ Table (Delete/Toggle Active)
    void deleteRule(Integer id);
    
    // 6. Phục vụ Validation
    boolean isEventCodeExists(String code, Integer excludeId);
}