package erp.company.supplychain.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PurchaseRequestDTO {
    private Integer prId;
    private String prCode;
    private Integer requesterId;
    private String requesterName; // Table: display name
    private Integer departmentId;
    private String departmentName; // Table: display name
    private LocalDate requestDate;
    private String reason;
    private String status;        // Enum name
    private LocalDateTime createdAt;
    
    private List<PrItemDTO> items; // Danh sách chi tiết
}