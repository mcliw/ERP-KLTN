package erp.company.supplychain.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;

@Entity
@Table(name = "product_categories")
@Data
public class ProductCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Integer categoryId;

    @Column(name = "category_name", nullable = false)
    private String categoryName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private ProductCategory parent;

    @OneToMany(mappedBy = "parent")
    private List<ProductCategory> subCategories;

    // --- Cập nhật bổ sung ---
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "status")
    private String status; // VD: "Hoạt động"
}