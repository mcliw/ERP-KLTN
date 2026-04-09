package erp.company.accounting.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import erp.company.accounting.entity.enums.PaymentMethod;
import erp.company.accounting.entity.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CashTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Long transactionId;

    // [MỚI] Mã phiếu hiển thị (User-friendly code: PC001, PT001)
    @Column(name = "transaction_code", length = 50)
    private String transactionCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    private PaymentMethod paymentMethod;

    @Column(name = "bank_account_number", length = 50)
    private String bankAccountNumber;

    @Column(name = "reference_doc_id")
    private Long referenceDocId; // Có thể link động tới AR/AP Invoice ID

    // [MỚI] Diễn giải chi tiết cho giao dịch tiền
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @OneToOne
    @JoinColumn(name = "entry_id", nullable = false)
    private JournalEntry journalEntry;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}