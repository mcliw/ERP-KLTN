package erp.company.supplychain.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "bin_locations")
@Data
public class BinLocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bin_id")
    private Integer binId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "bin_code", nullable = false)
    private String binCode;

    @Column(name = "max_capacity")
    private BigDecimal maxCapacity;

    // --- Cập nhật bổ sung ---
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active")
    private Boolean isActive;
}