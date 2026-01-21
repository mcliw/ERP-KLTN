package erp.company.accounting.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import erp.company.accounting.entity.enums.EntryStatus;
import erp.company.accounting.entity.enums.ModuleSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "journal_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JournalEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    private Long entryId;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @CreationTimestamp
    @Column(name = "posting_date")
    private LocalDateTime postingDate;

    @Column(name = "reference_no", length = 50)
    private String referenceNo;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_module", nullable = false)
    private ModuleSource sourceModule;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private EntryStatus status = EntryStatus.POSTED;

    @ManyToOne
    @JoinColumn(name = "fiscal_period_id")
    private FiscalPeriod fiscalPeriod;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal totalAmount;

    @Column(name = "created_by", length = 50)
    private String createdBy;

    // Quan hệ 1-N với Lines (Cascade ALL để khi lưu Entry tự lưu Lines)
    @OneToMany(mappedBy = "journalEntry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JournalEntryLine> lines;
}