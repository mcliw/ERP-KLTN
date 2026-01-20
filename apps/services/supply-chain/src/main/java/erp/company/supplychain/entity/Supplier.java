package erp.company.supplychain.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Entity
@Table(name = "suppliers")
@Data
@EqualsAndHashCode(callSuper = true)
public class Supplier extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "supplier_id")
    private Integer supplierId;

    @Column(name = "supplier_code", unique = true, nullable = false)
    private String supplierCode;

    @Column(name = "supplier_name", nullable = false)
    private String supplierName;

    @Column(name = "tax_code")
    private String taxCode;

    private BigDecimal rating;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    private String address;

    @Column(name = "finance_partner_id")
    private Integer financePartnerId;

    // --- Cập nhật bổ sung ---
    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "status")
    private String status; // VD: "Đang hợp tác"

    @Column(name = "contract_url")
    private String contractUrl;
}