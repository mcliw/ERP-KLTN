package erp.company.accounting.dto;

import erp.company.accounting.entity.enums.AccountType;
import lombok.Data;

@Data
public class FaAccountDTO {
    private Integer id;                 // Dùng cho Update
    private String accountCode;         // Frontend: account_code
    private String accountName;         // Frontend: account_name
    private AccountType accountType;    // Frontend: account_type (ASSET, LIABILITY...)
    private Integer parentAccountId;    // Frontend: parent_account_id
    private Boolean isActive;           // Frontend: is_active
    
    // Trường mới có ở Frontend nhưng thiếu ở Entity
    private String balanceSide;         // Frontend: balance_side (DEBIT, CREDIT, BOTH)
}