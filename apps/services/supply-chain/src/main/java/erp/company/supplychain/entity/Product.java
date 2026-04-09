package erp.company.supplychain.entity;

import erp.company.supplychain.entity.enums.ProductType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "products")
@Data
@EqualsAndHashCode(callSuper = true)
public class Product extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Integer productId;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private ProductCategory category;

    @Column(name = "unit_of_measure")
    private String unitOfMeasure;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_type")
    private ProductType productType;

    @Column(name = "min_stock_level")
    private Integer minStockLevel;

    private String brand;

    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    @Column(name = "image_url")
    private String imageUrl;

    // --- Cập nhật bổ sung ---
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "status")
    private String status; // VD: "Hoạt động", "Ngừng hoạt động"
}