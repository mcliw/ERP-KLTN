package erp.company.accounting.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ReceiptDTO {
    // Frontend dùng "id" là String (Số phiếu: PT001)
    private String transactionCode;     // Map từ field "id" ở Frontend
    
    private LocalDate transactionDate;  // Frontend: transaction_date
    private Integer customerId;         // Frontend: customer_id
    
    // Frontend form Receipt hiện tại chọn đơn lẻ (Select)
    private String orderId;             // Frontend: order_id
    
    private BigDecimal amount;          // Frontend: amount
    
    private String debitAccountCode;    // Frontend: debit_account_code (111/112)
    private String creditAccountCode;   // Frontend: credit_account_code (131)
    
    private String description;         // Frontend: description
}