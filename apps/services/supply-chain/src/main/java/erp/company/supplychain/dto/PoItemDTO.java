package erp.company.supplychain.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PoItemDTO {
    private Integer poItemId;
    private Integer productId;
    private String productCode;
    private String productName;
    private Integer quantityOrdered;
    private Integer quantityReceived;
    private BigDecimal unitPrice;
    private BigDecimal totalLineAmount;
}