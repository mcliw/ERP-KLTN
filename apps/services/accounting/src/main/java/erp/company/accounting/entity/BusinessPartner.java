package erp.company.accounting.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import erp.company.accounting.entity.enums.PartnerType;

import java.time.LocalDateTime;

@Entity
@Table(name = "business_partners", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"partner_type", "external_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessPartner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "partner_id")
    private Integer partnerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "partner_type", nullable = false)
    private PartnerType partnerType;

    @Column(name = "external_id", nullable = false, length = 50)
    private String externalId;

    @Column(name = "partner_name", nullable = false)
    private String partnerName;

    @Column(name = "tax_code", length = 50)
    private String taxCode;

    @Column(name = "contact_info")
    private String contactInfo;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}