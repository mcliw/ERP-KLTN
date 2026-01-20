package erp.company.supplychain.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class PrItemDTO {
    private Integer prItemId;
    private Integer productId;
    private String productName;
    private Integer quantityRequested;
    private LocalDate expectedDate;
}