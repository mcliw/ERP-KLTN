package erp.company.accounting.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import erp.company.accounting.dto.PostingRuleDTO;
import erp.company.accounting.entity.ChartOfAccounts;
import erp.company.accounting.entity.PostingRule;
import erp.company.accounting.entity.enums.ModuleSource;
import erp.company.accounting.repository.ChartOfAccountsRepository;
import erp.company.accounting.repository.PostingRuleRepository;
import erp.company.accounting.service.PostingRuleService;

@Service
@RequiredArgsConstructor
@Transactional
public class PostingRuleServiceImpl implements PostingRuleService {

    private final PostingRuleRepository ruleRepo;
    private final ChartOfAccountsRepository accountRepo;

    // --- Helpers ---
    private PostingRuleDTO mapToDTO(PostingRule entity) {
        PostingRuleDTO dto = new PostingRuleDTO();
        dto.setRuleId(entity.getRuleId());
        dto.setEventCode(entity.getEventCode());
        dto.setEventDescription(entity.getEventDescription());
        dto.setModuleSource(entity.getModuleSource());
        dto.setIsActive(entity.getIsActive());
        
        if (entity.getDebitAccount() != null) dto.setDebitAccountId(entity.getDebitAccount().getAccountId());
        if (entity.getCreditAccount() != null) dto.setCreditAccountId(entity.getCreditAccount().getAccountId());
        
        return dto;
    }

    @Override
    public Page<PostingRule> getPostingRules(String keyword, ModuleSource module, Integer accountId, Boolean isActive, Pageable pageable) {
        Specification<PostingRule> spec = (root, query, cb) -> {
            var predicate = cb.conjunction();

            if (StringUtils.hasText(keyword)) {
                String pattern = "%" + keyword.toLowerCase() + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(cb.lower(root.get("eventCode")), pattern),
                        cb.like(cb.lower(root.get("eventDescription")), pattern)
                ));
            }
            if (module != null) {
                predicate = cb.and(predicate, cb.equal(root.get("moduleSource"), module));
            }
            if (isActive != null) {
                predicate = cb.and(predicate, cb.equal(root.get("isActive"), isActive));
            }
            // Logic lọc theo tài khoản (Nợ HOẶC Có đều dính)
            if (accountId != null) {
                predicate = cb.and(predicate, cb.or(
                    cb.equal(root.get("debitAccount").get("accountId"), accountId),
                    cb.equal(root.get("creditAccount").get("accountId"), accountId)
                ));
            }

            return predicate;
        };
        return ruleRepo.findAll(spec, pageable);
    }

    @Override
    public PostingRuleDTO getRuleById(Integer id) {
        PostingRule entity = ruleRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found: " + id));
        return mapToDTO(entity);
    }

    @Override
    public PostingRule createRule(PostingRuleDTO dto) {
        if (ruleRepo.existsByEventCode(dto.getEventCode())) {
            throw new IllegalArgumentException("Mã sự kiện đã tồn tại");
        }
        PostingRule entity = new PostingRule();
        return saveOrUpdate(entity, dto);
    }

    @Override
    public PostingRule updateRule(Integer id, PostingRuleDTO dto) {
        PostingRule entity = ruleRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found"));
        
        if (ruleRepo.existsByEventCodeAndRuleIdNot(dto.getEventCode(), id)) {
            throw new IllegalArgumentException("Mã sự kiện đã tồn tại");
        }
        return saveOrUpdate(entity, dto);
    }

    private PostingRule saveOrUpdate(PostingRule entity, PostingRuleDTO dto) {
        entity.setEventCode(dto.getEventCode());
        entity.setEventDescription(dto.getEventDescription());
        entity.setModuleSource(dto.getModuleSource());
        entity.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);

        // Map Accounts
        ChartOfAccounts debit = accountRepo.findById(dto.getDebitAccountId())
                .orElseThrow(() -> new IllegalArgumentException("TK Nợ không hợp lệ"));
        ChartOfAccounts credit = accountRepo.findById(dto.getCreditAccountId())
                .orElseThrow(() -> new IllegalArgumentException("TK Có không hợp lệ"));

        if (debit.getAccountId().equals(credit.getAccountId())) {
            throw new IllegalArgumentException("TK Nợ và Có không được trùng nhau");
        }

        entity.setDebitAccount(debit);
        entity.setCreditAccount(credit);

        return ruleRepo.save(entity);
    }

    @Override
    public void deleteRule(Integer id) {
        PostingRule entity = ruleRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rule not found"));
        entity.setIsActive(false); // Soft delete
        ruleRepo.save(entity);
    }

    @Override
    public boolean isEventCodeExists(String code, Integer excludeId) {
        if (excludeId == null) return ruleRepo.existsByEventCode(code);
        return ruleRepo.existsByEventCodeAndRuleIdNot(code, excludeId);
    }
}