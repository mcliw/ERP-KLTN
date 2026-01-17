package erp.company.hrm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "payslips")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Payslip extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payslip_id")
    private Long payslipId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    private Integer month;
    private Integer year;

    @Column(name = "standard_work_days")
    private Double standardWorkDays;

    @Column(name = "actual_work_days")
    private Double actualWorkDays;

    @Column(name = "leave_paid_days")
    private Double leavePaidDays;

    @Column(name = "gross_salary")
    private BigDecimal grossSalary;

    @Column(name = "tax_deduction")
    private BigDecimal taxDeduction;

    @Column(name = "insurance_deduction")
    private BigDecimal insuranceDeduction;

    @Column(name = "advance_payment")
    private BigDecimal advancePayment;

    @Column(name = "net_salary")
    private BigDecimal netSalary;

    private Boolean status;
}