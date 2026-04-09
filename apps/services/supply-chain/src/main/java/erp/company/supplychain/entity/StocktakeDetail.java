package erp.company.supplychain.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "stocktake_details")
@Data
public class StocktakeDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "detail_id")
    private Integer detailId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stocktake_id", nullable = false)
    private Stocktake stocktake;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "system_quantity")
    private Integer systemQuantity;

    @Column(name = "actual_quantity")
    private Integer actualQuantity;

    // Cột Generated Always
    @Column(name = "difference", insertable = false, updatable = false)
    private Integer difference;
}
