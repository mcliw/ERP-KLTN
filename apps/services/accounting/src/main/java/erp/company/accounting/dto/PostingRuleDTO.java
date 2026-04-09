package erp.company.accounting.dto;

import erp.company.accounting.entity.enums.ModuleSource;
import lombok.Data;

@Data
public class PostingRuleDTO {
    private Integer ruleId;             // Dùng cho Update
    private String eventCode;           // Frontend: event_code
    private String eventDescription;    // Frontend: event_description
    private ModuleSource moduleSource;  // Frontend: module_source
    
    // Frontend gửi ID tài khoản (dropdown chọn từ list)
    private Integer debitAccountId;     // Frontend: debit_account_id
    private Integer creditAccountId;    // Frontend: credit_account_id
    
    // Trường mới có ở logic Frontend (Filter/Table) nhưng thiếu ở Entity
    private Boolean isActive;           
}