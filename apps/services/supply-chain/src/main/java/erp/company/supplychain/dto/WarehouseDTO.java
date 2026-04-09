package erp.company.supplychain.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class WarehouseDTO {
    private Integer warehouseId;
    private String warehouseCode; // Form: code
    private String warehouseName; // Form: name
    private String warehouseType; // Form: type (Enum)
    private String address;
    private Boolean isActive;     // Form: is_active
    private LocalDateTime createdAt;
}