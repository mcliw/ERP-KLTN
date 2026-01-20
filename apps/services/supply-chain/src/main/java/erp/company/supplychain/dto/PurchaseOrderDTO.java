package erp.company.supplychain.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class PurchaseOrderDTO {
    private Integer poId;
    private String poCode;
    private Integer quotationId;
    private String quotationCode; // Table: display RFQ
    private Integer supplierId;
    private String supplierName;
    private LocalDate orderDate;
    private LocalDate expectedDeliveryDate;
    private BigDecimal totalAmount;
    private BigDecimal taxAmount;
    private BigDecimal discountAmount;
    private String status;
    private Integer approvedBy;
    
    private List<PoItemDTO> items;
}