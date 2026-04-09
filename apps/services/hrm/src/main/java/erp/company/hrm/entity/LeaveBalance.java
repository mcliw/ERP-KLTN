package erp.company.hrm.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "leave_balances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LeaveBalance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "balance_id")
    private Integer balanceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    private Integer year;

    @Column(name = "total_entitlement")
    private Double totalEntitlement;

    private Double used;

    // Cột này database tự tính, Java chỉ đọc, không được insert/update
    @Column(insertable = false, updatable = false)
    private Double remaining;
}