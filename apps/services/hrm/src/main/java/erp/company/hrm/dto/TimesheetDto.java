package erp.company.hrm.dto;

import erp.company.hrm.entity.enums.TimesheetStatus;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimesheetDto {
    private Long timesheetId;
    private String employeeId;
    private String employeeName;
    private LocalDate workDate;
    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private Double workingHours;
    private Double paidWorkDay;
    private TimesheetStatus status;
    private String note;

    // BaseEntity fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}