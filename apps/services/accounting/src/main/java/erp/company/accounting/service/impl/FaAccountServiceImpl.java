package erp.company.accounting.service.impl;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import erp.company.accounting.dto.FaAccountDTO;
import erp.company.accounting.entity.ChartOfAccounts;
import erp.company.accounting.entity.enums.AccountType;
import erp.company.accounting.repository.ChartOfAccountsRepository;
import erp.company.accounting.service.FaAccountService;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FaAccountServiceImpl implements FaAccountService {

    private final ChartOfAccountsRepository accountRepo;

    // --- Helpers Mapping ---
    private FaAccountDTO mapToDTO(ChartOfAccounts entity) {
        FaAccountDTO dto = new FaAccountDTO();
        dto.setId(entity.getAccountId());
        dto.setAccountCode(entity.getAccountCode());
        dto.setAccountName(entity.getAccountName());
        dto.setAccountType(entity.getAccountType());
        dto.setIsActive(entity.getIsActive());
        dto.setBalanceSide(entity.getBalanceSide() != null ? entity.getBalanceSide().name() : "BOTH");
        
        if (entity.getParentAccount() != null) {
            dto.setParentAccountId(entity.getParentAccount().getAccountId());
        }
        return dto;
    }

    private ChartOfAccounts mapToEntity(FaAccountDTO dto, ChartOfAccounts entity) {
        entity.setAccountCode(dto.getAccountCode());
        entity.setAccountName(dto.getAccountName());
        entity.setAccountType(dto.getAccountType());
        // Enum conversion handle handled by Controller Valid or simple valueOf
        if (dto.getBalanceSide() != null) {
             entity.setBalanceSide(erp.company.accounting.entity.enums.BalanceSide.valueOf(dto.getBalanceSide()));
        }
        entity.setIsActive(dto.getIsActive());
        return entity;
    }

    @Override
    public Page<ChartOfAccounts> getAccounts(String keyword, AccountType type, Integer parentId, Boolean isActive, Pageable pageable) {
        Specification<ChartOfAccounts> spec = (root, query, cb) -> {
            var predicate = cb.conjunction();

            // Lọc theo keyword (Code hoặc Name)
            if (StringUtils.hasText(keyword)) {
                String likePattern = "%" + keyword.toLowerCase() + "%";
                predicate = cb.and(predicate, cb.or(
                        cb.like(cb.lower(root.get("accountCode")), likePattern),
                        cb.like(cb.lower(root.get("accountName")), likePattern)
                ));
            }

            // Lọc theo loại
            if (type != null) {
                predicate = cb.and(predicate, cb.equal(root.get("accountType"), type));
            }

            // Lọc theo cha
            if (parentId != null) {
                predicate = cb.and(predicate, cb.equal(root.get("parentAccount").get("accountId"), parentId));
            }

            // Lọc trạng thái
            if (isActive != null) {
                predicate = cb.and(predicate, cb.equal(root.get("isActive"), isActive));
            }

            return predicate;
        };

        return accountRepo.findAll(spec, pageable);
    }

    @Override
    public FaAccountDTO getAccountById(Integer id) {
        ChartOfAccounts acc = accountRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài khoản ID: " + id));
        return mapToDTO(acc);
    }

    @Override
    public ChartOfAccounts createAccount(FaAccountDTO dto) {
        if (accountRepo.existsByAccountCode(dto.getAccountCode())) {
            throw new IllegalArgumentException("Mã tài khoản đã tồn tại: " + dto.getAccountCode());
        }

        ChartOfAccounts entity = new ChartOfAccounts();
        mapToEntity(dto, entity);
        
        // Xử lý Parent
        handleParentAccount(dto.getParentAccountId(), entity);

        return accountRepo.save(entity);
    }

    @Override
    public ChartOfAccounts updateAccount(Integer id, FaAccountDTO dto) {
        ChartOfAccounts entity = accountRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài khoản ID: " + id));

        if (accountRepo.existsByAccountCodeAndAccountIdNot(dto.getAccountCode(), id)) {
            throw new IllegalArgumentException("Mã tài khoản đã tồn tại: " + dto.getAccountCode());
        }

        // Logic check vòng lặp cha con
        if (Objects.equals(dto.getParentAccountId(), id)) {
            throw new IllegalArgumentException("Tài khoản cha không thể là chính nó");
        }

        mapToEntity(dto, entity);
        handleParentAccount(dto.getParentAccountId(), entity);

        return accountRepo.save(entity);
    }

    private void handleParentAccount(Integer parentId, ChartOfAccounts entity) {
        if (parentId != null) {
            ChartOfAccounts parent = accountRepo.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("Tài khoản cha không tồn tại"));
            
            // Logic nghiệp vụ: Con phải cùng loại với cha (Assets con Assets...)
            if (entity.getAccountType() != null && parent.getAccountType() != entity.getAccountType()) {
                 throw new IllegalArgumentException("Loại tài khoản con phải trùng với cha");
            }
            entity.setParentAccount(parent);
        } else {
            entity.setParentAccount(null);
        }
    }

    @Override
    public void deleteAccount(Integer id) {
        ChartOfAccounts entity = accountRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Account not found"));
        // Soft Delete
        entity.setIsActive(false);
        accountRepo.save(entity);
    }

    @Override
    public boolean isAccountCodeExists(String code, Integer excludeId) {
        if (excludeId == null) return accountRepo.existsByAccountCode(code);
        return accountRepo.existsByAccountCodeAndAccountIdNot(code, excludeId);
    }

    @Override
    public List<FaAccountDTO> getActiveAccountsForDropdown() {
        return accountRepo.findByIsActiveTrueOrderByAccountCodeAsc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }
}