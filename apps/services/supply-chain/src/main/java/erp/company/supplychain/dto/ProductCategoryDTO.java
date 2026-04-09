package erp.company.supplychain.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ProductCategoryDTO {
    private Integer categoryId;
    private String categoryName;  // Form: name
    private Integer parentId;
    private String parentName;    // Table: display name
    private String description;   // Form: description (Trường mới bổ sung)
    private String status;        // Form: status (Trường mới bổ sung)
    private LocalDateTime createdAt;
}