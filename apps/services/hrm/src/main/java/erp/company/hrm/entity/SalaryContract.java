package erp.company.hrm.entity;

import erp.company.hrm.entity.enums.SalaryStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "salary_contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryContract extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contract_id")
    private Integer contractId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "base_salary", nullable = false)
    private BigDecimal baseSalary;

    private BigDecimal allowance;

    @Column(name = "insurance_salary")
    private BigDecimal insuranceSalary;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    // [UPDATE] Thay thế is_active boolean bằng status Enum
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private SalaryStatus status;
}