package erp.company.accounting.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import erp.company.accounting.dto.FaAccountDTO;
import erp.company.accounting.entity.ChartOfAccounts;
import erp.company.accounting.entity.enums.AccountType;

import java.util.List;

public interface FaAccountService {

    // 1. Phục vụ Table & Filter
    // Trả về Page<Entity> hoặc Page<DTO> tùy chiến lược mapping
    Page<ChartOfAccounts> getAccounts(String keyword, AccountType type, Integer parentId, Boolean isActive, Pageable pageable);

    // 2. Phục vụ Form (View/Edit Details)
    FaAccountDTO getAccountById(Integer id);

    // 3. Phục vụ Form (Create)
    ChartOfAccounts createAccount(FaAccountDTO dto);

    // 4. Phục vụ Form (Update)
    ChartOfAccounts updateAccount(Integer id, FaAccountDTO dto);

    // 5. Phục vụ Table (Delete/Deactivate)
    void deleteAccount(Integer id);

    // 6. Phục vụ Validation (Async Check)
    boolean isAccountCodeExists(String code, Integer excludeId);

    // 7. Phục vụ Dropdown (Chọn tài khoản cha) - Chỉ lấy Active
    List<FaAccountDTO> getActiveAccountsForDropdown();
}