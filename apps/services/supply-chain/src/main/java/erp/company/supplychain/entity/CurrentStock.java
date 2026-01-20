package erp.company.supplychain.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "current_stock")
@Data
public class CurrentStock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stock_id")
    private Integer stockId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bin_id")
    private BinLocation binLocation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "quantity_on_hand")
    private Integer quantityOnHand;

    @Column(name = "quantity_allocated")
    private Integer quantityAllocated;

    // Cột Computed: Chỉ đọc, không được insert/update từ Java
    @Column(name = "quantity_available", insertable = false, updatable = false)
    private Integer quantityAvailable;

    @Column(name = "updated_at")
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // --- Cập nhật bổ sung ---
    @Column(columnDefinition = "TEXT")
    private String notes;
}