package erp.company.supplychain.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

import erp.company.supplychain.entity.enums.GrStatus;

@Entity
@Table(name = "goods_receipts")
@Data
public class GoodsReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gr_id")
    private Integer grId;

    @Column(name = "gr_code", unique = true, nullable = false)
    private String grCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_id")
    private PurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "receipt_date")
    private LocalDateTime receiptDate;

    @Enumerated(EnumType.STRING)
    private GrStatus status;

    @OneToMany(mappedBy = "goodsReceipt", cascade = CascadeType.ALL)
    private List<GrItem> items;
}
