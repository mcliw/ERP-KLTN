package erp.company.accounting.controller;

import com.fasterxml.jackson.databind.ObjectMapper;

import erp.company.accounting.dto.PaymentSlipDTO;
import erp.company.accounting.dto.ReceiptDTO;
import erp.company.accounting.entity.CashTransaction;
import erp.company.accounting.entity.enums.TransactionType;
import erp.company.accounting.service.CashTransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/cash_transactions")
@CrossOrigin(origins = "*")
public class CashTransactionController {

    private final CashTransactionService cashTransactionService = null;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @GetMapping
    public ResponseEntity<?> getTransactions(
            @RequestParam(required = false, name = "transaction_type") TransactionType type,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, name = "account_code") String accountCode,
            @PageableDefault(size = 1000) Pageable pageable) {

        Page<CashTransaction> page = cashTransactionService.getTransactions(type, keyword, accountCode, pageable);
        return ResponseEntity.ok(page.getContent());
    }

    // 2. GET Detail
    @GetMapping("/{id}")
    public ResponseEntity<CashTransaction> getTransactionById(@PathVariable Long id) {
        // Frontend JS gửi ID (có thể là String PC001), nhưng path variable nên map vào Long
        // Nếu Frontend gửi String ID (PC001) vào URL -> Cần Service tìm theo Code. 
        // Tuy nhiên, logic JSON Server thường dùng ID tự tăng. Ta giả định ID ở URL là ID số.
        return ResponseEntity.ok(cashTransactionService.getTransactionById(id));
    }

    // 3. POST Create (Xử lý đa hình: Payment hoặc Receipt)
    // Frontend JS gửi đến cùng 1 URL, ta cần phân loại dựa vào transaction_type body
    @PostMapping
    public ResponseEntity<CashTransaction> createTransaction(@RequestBody Map<String, Object> payload) {
        String typeStr = (String) payload.get("transaction_type");
        TransactionType type = TransactionType.valueOf(typeStr);

        if (type == TransactionType.PAYMENT) {
            // Convert Payload -> PaymentSlipDTO
            PaymentSlipDTO dto = objectMapper.convertValue(payload, PaymentSlipDTO.class);
            return ResponseEntity.ok(cashTransactionService.createPaymentSlip(dto));
        } else if (type == TransactionType.RECEIPT) {
            // Convert Payload -> ReceiptDTO
            ReceiptDTO dto = objectMapper.convertValue(payload, ReceiptDTO.class);
            return ResponseEntity.ok(cashTransactionService.createReceipt(dto));
        } else {
            return ResponseEntity.badRequest().build();
        }
    }

    // 4. PUT Update (Tương tự POST)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTransaction(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        
        // Kiểm tra logic Soft Delete từ Frontend (paymentSlip.service.js dùng PUT để update deleted_at)
        if (payload.containsKey("deleted_at") && payload.get("deleted_at") != null) {
            cashTransactionService.deleteTransaction(id);
            return ResponseEntity.ok().build();
        }
        
        // Logic Restore (deleted_at = null)
        if (payload.containsKey("deleted_at") && payload.get("deleted_at") == null) {
            // Restore logic (có thể cần method riêng trong service)
            // Tạm thời gọi update bình thường hoặc bỏ qua
             return ResponseEntity.ok().build(); 
        }

        String typeStr = (String) payload.get("transaction_type");
        TransactionType type = TransactionType.valueOf(typeStr);

        if (type == TransactionType.PAYMENT) {
            PaymentSlipDTO dto = objectMapper.convertValue(payload, PaymentSlipDTO.class);
            return ResponseEntity.ok(cashTransactionService.updatePaymentSlip(id, dto));
        } else if (type == TransactionType.RECEIPT) {
            ReceiptDTO dto = objectMapper.convertValue(payload, ReceiptDTO.class);
            return ResponseEntity.ok(cashTransactionService.updateReceipt(id, dto));
        }
        
        return ResponseEntity.badRequest().build();
    }

    // 5. DELETE Hard Delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
        cashTransactionService.deleteTransaction(id); // Hard delete
        return ResponseEntity.noContent().build();
    }
}