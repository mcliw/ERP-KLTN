package erp.company.accounting.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class PaymentSlipDTO {
    // Frontend dùng "id" là String (Số phiếu: PC001)
    private String transactionCode;     // Map từ field "id" ở Frontend
    
    private LocalDate transactionDate;  // Frontend: transaction_date
    private Integer supplierId;         // Frontend: supplier_id
    
    // Frontend gửi mảng ID các đơn mua hàng cần thanh toán
    private List<String> purchaseOrderIds; 
    
    private BigDecimal amount;          // Frontend: amount
    
    // Frontend gửi Account Code (331, 111...), Service cần tìm ID tương ứng
    private String debitAccountCode;    
    private String creditAccountCode;   
    
    private String bankAccountNumber;   // Frontend: bank_account_number (nếu credit là 112)
    private String description;         // Frontend: description
}