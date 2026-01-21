package erp.company.sales.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "\"order\"") // Escape tên bảng vì trùng keyword SQL
@Data
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Link tới User hệ thống (Optional - nếu khách có tài khoản login)
    @Column(name = "user_id")
    private Integer userId;

    // Link tới Customer CRM (Bắt buộc cho module Sales)
    // Dùng UUID để khớp với bảng Customers
    @Column(name = "customer_id")
    private UUID customerId;

    // Relationship tới Customer Entity (để tiện lấy full_name, phone...)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", insertable = false, updatable = false)
    private Customer customer;

    @Column(name = "voucher_detail_id")
    private Integer voucherDetailId;

    @Column(name = "payment_id")
    private Integer paymentId;

    @Column(name = "order_status")
    private String orderStatus; // PENDING, SHIPPING...

    @Column(name = "payment_method")
    private String paymentMethod; // COD, MOMO...

    @Column(name = "shipping_address")
    private String shippingAddress;
    
    // Tổng tiền (Lưu ý: SQL gốc chưa có cột này, nếu bạn thêm vào SQL thì uncomment dòng dưới)
    // @Column(name = "total_amount")
    // private BigDecimal totalAmount;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderDetail> orderDetails;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}