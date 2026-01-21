package erp.company.accounting.entity;

import erp.company.accounting.entity.enums.ModuleSource;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "posting_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rule_id")
    private Integer ruleId;

    @Column(name = "event_code", nullable = false, unique = true, length = 50)
    private String eventCode;

    @Column(name = "event_description")
    private String eventDescription;

    @ManyToOne
    @JoinColumn(name = "debit_account_id", nullable = false)
    private ChartOfAccounts debitAccount;

    @ManyToOne
    @JoinColumn(name = "credit_account_id", nullable = false)
    private ChartOfAccounts creditAccount;

    @Enumerated(EnumType.STRING)
    @Column(name = "module_source", nullable = false)
    private ModuleSource moduleSource;

    // [MỚI] Trạng thái hoạt động
    @Column(name = "is_active")
    private Boolean isActive = true;
}