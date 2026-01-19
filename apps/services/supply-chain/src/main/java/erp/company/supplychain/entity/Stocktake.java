package erp.company.supplychain.entity;

import erp.company.supplychain.entity.enums.StocktakeStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "stocktakes")
@Data
@EqualsAndHashCode(callSuper = true)
public class Stocktake extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stocktake_id")
    private Integer stocktakeId;

    @Column(name = "stocktake_code", unique = true, nullable = false)
    private String stocktakeCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "stocktake_date")
    private LocalDate stocktakeDate;

    @Enumerated(EnumType.STRING)
    private StocktakeStatus status;

    @OneToMany(mappedBy = "stocktake", cascade = CascadeType.ALL)
    private List<StocktakeDetail> details;
}
