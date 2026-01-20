package erp.company.supplychain.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "quotations")
@Data
@EqualsAndHashCode(callSuper = true)
public class Quotation extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quotation_id")
    private Integer quotationId;

    @Column(name = "quotation_code", unique = true, nullable = false)
    private String quotationCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Column(name = "quotation_date")
    private LocalDate quotationDate;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(name = "total_amount", precision = 19, scale = 4)
    private BigDecimal totalAmount;

    private String notes;

    // --- Cập nhật bổ sung ---

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pr_id")
    private PurchaseRequest purchaseRequest;

    @Column(name = "is_selected")
    private Boolean isSelected;

    @Column(name = "status")
    private String status; // VD: PENDING, APPROVED, REJECTED

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuotationItem> items;
}