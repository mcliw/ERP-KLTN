package erp.company.hrm.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimesheetDTO {
    private Long id;                // timesheetId
    private Integer employeeId;     // Form
    private String employeeCode;    // Table
    private String employeeName;    // Table
    private String departmentName;  // Table
    private String positionName;    // Table

    private LocalDate date;         // Form: Ngày chấm công
    private LocalTime checkInTime;  // Form: Giờ vào
    private LocalTime checkOutTime; // Form: Giờ ra
    
    private String status;          // Form: Enum (Đúng giờ, Đi muộn...)
    private String note;            // Form: Ghi chú
    
    private Double workCount;       // Table: Số công (paidWorkDay)
}