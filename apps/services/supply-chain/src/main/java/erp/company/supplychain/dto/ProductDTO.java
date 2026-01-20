package erp.company.supplychain.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ProductDTO {
    private Integer productId;
    private String sku;           // Form: code
    private String productName;   // Form: name
    private Integer categoryId;
    private String categoryName;  // Table: display name
    private String productType;   // Form: type
    private String brand;
    private String unitOfMeasure; // Form: unit
    private Integer minStockLevel; // Form: minStock
    private Integer warrantyMonths; // Form: warranty
    private String description;   // Form: description (Trường mới bổ sung)
    private String imageUrl;      // Form: image
    private String status;        // Form: status (Trường mới bổ sung)
    private LocalDateTime createdAt;
}