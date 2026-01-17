package erp.company.hrm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceLog extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "check_time", nullable = false)
    private LocalDateTime checkTime;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "device_id")
    private String deviceId;
}