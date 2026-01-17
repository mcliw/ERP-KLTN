package erp.company.supplychain.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "gr_items")
@Data
public class GrItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gr_item_id")
    private Integer grItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gr_id", nullable = false)
    private GoodsReceipt goodsReceipt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bin_id")
    private BinLocation binLocation;

    @Column(name = "quantity_received", nullable = false)
    private Integer quantityReceived;

    @Column(name = "batch_number")
    private String batchNumber;
}
