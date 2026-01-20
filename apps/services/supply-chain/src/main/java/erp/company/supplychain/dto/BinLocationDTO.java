package erp.company.supplychain.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class BinLocationDTO {
    private Integer binId;
    private Integer warehouseId;
    private String warehouseName; // Table: display name
    private String binCode;       // Form: code
    private BigDecimal maxCapacity;
    private String description;   // Form: description (Trường mới bổ sung)
    private Boolean isActive;     // Form: is_active (Trường mới bổ sung)
    private LocalDateTime createdAt;
}