package erp.company.supplychain.entity;

import erp.company.supplychain.entity.enums.PrStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "purchase_requests")
@Data
@EqualsAndHashCode(callSuper = true)
public class PurchaseRequest extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pr_id")
    private Integer prId;

    @Column(name = "pr_code", unique = true, nullable = false)
    private String prCode;

    // Liên kết lỏng (Loose coupling) với HRM
    @Column(name = "requester_id")
    private Integer requesterId;

    @Column(name = "department_id")
    private Integer departmentId;

    @Column(name = "request_date")
    private LocalDate requestDate;

    private String reason;

    @Enumerated(EnumType.STRING)
    private PrStatus status;

    @OneToMany(mappedBy = "purchaseRequest", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PrItem> items;
}
