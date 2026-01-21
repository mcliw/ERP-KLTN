package erp.company.accounting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import erp.company.accounting.entity.ChartOfAccounts;

import java.util.List;

@Repository
public interface ChartOfAccountsRepository extends JpaRepository<ChartOfAccounts, Integer>, JpaSpecificationExecutor<ChartOfAccounts> {

    // 1. Hỗ trợ Validation form: Check trùng mã
    boolean existsByAccountCode(String accountCode);

    // Check trùng mã nhưng ngoại trừ ID hiện tại (dùng cho Edit form)
    boolean existsByAccountCodeAndAccountIdNot(String accountCode, Integer accountId);

    // 2. Hỗ trợ Dropdown chọn tài khoản cha/tài khoản hạch toán (chỉ lấy active)
    List<ChartOfAccounts> findByIsActiveTrueOrderByAccountCodeAsc();
    
    // Tìm cụ thể theo mã (dùng để map DTO khi Frontend gửi code 111, 331...)
    ChartOfAccounts findByAccountCode(String accountCode);
}