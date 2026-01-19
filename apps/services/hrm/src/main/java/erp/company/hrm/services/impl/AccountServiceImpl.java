package erp.company.hrm.services.impl;

import erp.company.hrm.dto.AccountDTO;
import erp.company.hrm.entity.Employee;
import erp.company.hrm.repository.EmployeeRepository;
import erp.company.hrm.services.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AccountServiceImpl implements AccountService {

    private final EmployeeRepository employeeRepository;

    // Lưu ý: Trong thiết kế DB hiện tại, thông tin Account được merge vào bảng Employee (email, password...) 
    // Hoặc giả định có bảng Account riêng nhưng file entity chưa rõ ràng.
    // Dựa trên hrm_db.json, "accounts" là bảng riêng.
    // Tuy nhiên ở file Entity Java, ta thấy account_id trong Employee link tới Auth Service.
    // Ở đây tôi sẽ giả lập logic lấy thông tin Account từ Employee vì Employee có email/password.

    @Override
    public Page<AccountDTO> getAccounts(String keyword, String role, String status, Pageable pageable) {
        // Mocking: Tìm nhân viên có account_id != null
        // Thực tế sẽ gọi Auth Service hoặc query bảng Account nếu có
        return Page.empty(); 
    }

    @Override
    public AccountDTO getAccountById(UUID accountId) {
        Employee e = employeeRepository.findByAccountId(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));
        return mapToDTO(e);
    }

    @Override
    public AccountDTO createAccount(AccountDTO dto) {
        // Tìm nhân viên
        Employee e = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Nhân viên không tồn tại"));

        if (e.getAccountId() != null) {
            throw new RuntimeException("Nhân viên này đã có tài khoản");
        }

        // Tạo UUID mới cho account
        UUID newAccId = UUID.randomUUID();
        e.setAccountId(newAccId);
        // Lưu role, password (giả định lưu vào employee hoặc gọi Auth Service)
        // e.setRole(dto.getRole()); 
        employeeRepository.save(e);

        dto.setAccountId(newAccId);
        dto.setEmployeeName(e.getFullName());
        return dto;
    }

    @Override
    public AccountDTO updateAccount(UUID accountId, AccountDTO dto) {
        Employee e = employeeRepository.findByAccountId(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));
        
        // Update logic (Role, Status...)
        // e.setStatus(dto.getStatus());
        employeeRepository.save(e);
        return mapToDTO(e);
    }

    @Override
    public void resetPassword(UUID accountId, String newPassword) {
        // Logic hash password và lưu
    }

    @Override
    public void toggleAccountStatus(UUID accountId) {
        // Toggle status Active/Inactive
    }

    @Override
    public void deleteAccount(UUID accountId) {
        Employee e = employeeRepository.findByAccountId(accountId).orElseThrow();
        e.setAccountId(null); // Unlink account
        employeeRepository.save(e);
    }

    private AccountDTO mapToDTO(Employee e) {
        return AccountDTO.builder()
                .accountId(e.getAccountId())
                .username(e.getEmail()) // Username là email
                .email(e.getEmail())
                .employeeId(e.getEmployeeId())
                .employeeName(e.getFullName())
                .departmentName(e.getDepartment() != null ? e.getDepartment().getName() : "")
                .positionName(e.getPosition() != null ? e.getPosition().getName() : "")
                .role("USER") // Mock role
                .status("Active")
                .build();
    }
}