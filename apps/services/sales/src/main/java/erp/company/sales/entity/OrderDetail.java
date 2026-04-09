package erp.company.sales.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Entity
@Table(name = "order_detail")
@Data
public class OrderDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "product_variant_id")
    private Integer productVariantId;

    // Nếu cần join sang bảng ProductVariant để lấy tên sp:
    // @ManyToOne 
    // @JoinColumn(name = "product_variant_id", insertable = false, updatable = false)
    // private ProductVariant productVariant;

    private Integer quantity;

    private BigDecimal price; // Giá bán tại thời điểm tạo đơn
}