package erp.company.hrm.services;

import erp.company.hrm.dto.AccountDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;

public interface AccountService {
    // [Table & Filter] Tìm kiếm tài khoản
    Page<AccountDTO> getAccounts(String keyword, String role, String status, Pageable pageable);

    // [Form] Lấy chi tiết
    AccountDTO getAccountById(UUID accountId);

    // [Form] Tạo tài khoản mới cho nhân viên
    AccountDTO createAccount(AccountDTO accountDTO);

    // [Form] Cập nhật thông tin (Role, Status)
    AccountDTO updateAccount(UUID accountId, AccountDTO accountDTO);

    // [Quick Action] Reset mật khẩu
    void resetPassword(UUID accountId, String newPassword);

    // [Table Action] Khóa/Mở khóa tài khoản
    void toggleAccountStatus(UUID accountId);
    
    // [Table Action] Xóa tài khoản
    void deleteAccount(UUID accountId);
}