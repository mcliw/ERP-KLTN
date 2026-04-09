package erp.company.sales.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "voucher_detail")
@Data
public class VoucherDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String code; // Mã voucher (VD: SUMMER2024)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_id")
    private Voucher voucher;

    @Column(name = "is_active")
    private Boolean isActive;
}