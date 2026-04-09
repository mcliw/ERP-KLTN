package erp.company.supplychain.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class InventoryDTO {
    private Integer stockId;
    private Integer warehouseId;
    private String warehouseName;
    private Integer binId;
    private String binCode;
    private Integer productId;
    private String productName;
    private String productSku;
    
    private Integer quantityOnHand;
    private Integer quantityAllocated;
    private Integer quantityAvailable; // Table: computed
    
    private String notes;          // Form: notes (Trường mới bổ sung)
    private LocalDateTime updatedAt;
}