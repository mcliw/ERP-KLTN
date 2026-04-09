package erp.company.supplychain.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class QuotationDTO {
    private Integer quotationId;
    private String quotationCode; // Form: rfq_code
    private Integer supplierId;
    private String supplierName;
    private Integer prId;         // Form: pr_id (Trường mới bổ sung)
    private String prCode;        // Table: display PR Code
    private LocalDate quotationDate;
    private LocalDate validUntil;
    private BigDecimal totalAmount;
    private String status;        // Form: status (Trường mới bổ sung)
    private Boolean isSelected;   // Form: is_selected (Trường mới bổ sung)
    
    private List<QuotationItemDTO> items; // Dựa trên logic Form frontend
}