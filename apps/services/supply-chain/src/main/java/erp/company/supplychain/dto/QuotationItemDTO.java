package erp.company.supplychain.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class QuotationItemDTO {
    // DTO này map với bảng quotation_items mới được tạo trong SQL
    private Integer quotationItemId;
    private Integer productId;
    private String productName;   // Để hiển thị UI
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalLine;
}