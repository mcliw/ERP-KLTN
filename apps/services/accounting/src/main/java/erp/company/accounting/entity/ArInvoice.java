package erp.company.accounting.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

import erp.company.accounting.entity.enums.PaymentStatus;

@Entity
@Table(name = "ar_invoices")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invoice_id")
    private Long invoiceId;

    @ManyToOne
    @JoinColumn(name = "partner_id", nullable = false)
    private BusinessPartner partner;

    @Column(name = "sales_order_ref", length = 50)
    private String salesOrderRef;

    @Column(name = "invoice_date")
    private LocalDate invoiceDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "total_amount", precision = 19, scale = 4)
    private BigDecimal totalAmount;

    @Column(name = "received_amount", precision = 19, scale = 4)
    private BigDecimal receivedAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    @OneToOne
    @JoinColumn(name = "entry_id")
    private JournalEntry journalEntry;
}