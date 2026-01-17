package erp.company.hrm.entity;

import erp.company.hrm.entity.enums.TimesheetStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "timesheets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Timesheet extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "timesheet_id")
    private Long timesheetId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "check_in_time")
    private LocalTime checkInTime;

    @Column(name = "check_out_time")
    private LocalTime checkOutTime;

    @Column(name = "working_hours")
    private Double workingHours;

    @Column(name = "paid_work_day")
    private Double paidWorkDay;

    @Enumerated(EnumType.STRING)
    private TimesheetStatus status;

    private String note;
}