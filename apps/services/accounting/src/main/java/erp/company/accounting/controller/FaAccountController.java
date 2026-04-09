package erp.company.accounting.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import erp.company.accounting.dto.FaAccountDTO;
import erp.company.accounting.entity.ChartOfAccounts;
import erp.company.accounting.entity.enums.AccountType;
import erp.company.accounting.service.FaAccountService;

import java.util.List;

@RestController
@RequestMapping("/chart_of_accounts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Cho phép Frontend gọi API
public class FaAccountController {

    private final FaAccountService faAccountService;

    // 1. GET List (Hỗ trợ Filter & Pagination)
    // Frontend JS: faAccountService.getAll({ includeInactive })
    // URL: /chart_of_accounts?keyword=...&account_type=...
    @GetMapping
    public ResponseEntity<?> getAccounts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, name = "account_type") AccountType accountType,
            @RequestParam(required = false, name = "parent_account_id") Integer parentAccountId,
            @RequestParam(required = false, name = "is_active") Boolean isActive,
            @RequestParam(required = false, name = "account_code") String checkCode, // Hỗ trợ check trùng
            @PageableDefault(size = 1000) Pageable pageable) {

        // Logic phục vụ function checkCodeExists của Frontend
        if (checkCode != null) {
            boolean exists = faAccountService.isAccountCodeExists(checkCode, null);
            // Trả về list rỗng hoặc list có 1 phần tử để frontend check length
            return ResponseEntity.ok(exists ? List.of(new Object()) : List.of());
        }

        Page<ChartOfAccounts> page = faAccountService.getAccounts(keyword, accountType, parentAccountId, isActive, pageable);
        // Frontend đang mong đợi Array, nếu dùng Paging cần config lại Frontend hoặc trả về content
        return ResponseEntity.ok(page.getContent());
    }

    // 2. GET Detail
    // Frontend JS: faAccountService.getById(id)
    @GetMapping("/{id}")
    public ResponseEntity<FaAccountDTO> getAccountById(@PathVariable Integer id) {
        FaAccountDTO dto = faAccountService.getAccountById(id);
        return ResponseEntity.ok(dto);
    }

    // 3. POST Create
    // Frontend JS: faAccountService.create(data)
    @PostMapping
    public ResponseEntity<ChartOfAccounts> createAccount(@Valid @RequestBody FaAccountDTO dto) {
        ChartOfAccounts created = faAccountService.createAccount(dto);
        return ResponseEntity.ok(created);
    }

    // 4. PUT Update
    // Frontend JS: faAccountService.update(id, data)
    @PutMapping("/{id}")
    public ResponseEntity<ChartOfAccounts> updateAccount(
            @PathVariable Integer id,
            @Valid @RequestBody FaAccountDTO dto) {
        ChartOfAccounts updated = faAccountService.updateAccount(id, dto);
        return ResponseEntity.ok(updated);
    }

    // 5. PATCH Soft Delete / Restore / Partial Update
    // Frontend JS: faAccountService.remove(id) & restore(id) gửi PATCH { is_active: boolean }
    @PatchMapping("/{id}")
    public ResponseEntity<?> partialUpdate(
            @PathVariable Integer id,
            @RequestBody FaAccountDTO dto) {
        
        // Nếu chỉ gửi is_active = false -> Xử lý Soft Delete
        if (Boolean.FALSE.equals(dto.getIsActive())) {
            faAccountService.deleteAccount(id);
            return ResponseEntity.ok().build();
        }
        
        // Logic restore hoặc update field lẻ (được xử lý trong Service Update nếu cần)
        // Ở đây mapping về updateAccount cho đơn giản hoặc viết hàm restore riêng
        return ResponseEntity.ok(faAccountService.updateAccount(id, dto));
    }

    // 6. DELETE Hard Delete
    // Frontend JS: faAccountService.destroy(id)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> hardDeleteAccount(@PathVariable Integer id) {
        faAccountService.deleteAccount(id); // Giả sử service handle logic hard delete hoặc tạo hàm riêng
        return ResponseEntity.noContent().build();
    }
}