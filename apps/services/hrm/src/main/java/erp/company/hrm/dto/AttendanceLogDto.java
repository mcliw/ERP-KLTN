package erp.company.hrm.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceLogDto {
    private Long logId;
    private String employeeId;
    private String employeeName;
    private LocalDateTime checkTime;
    private String imageUrl;
    private Double confidenceScore;
    private String deviceId;
    
    // BaseEntity fields
    private LocalDateTime createdAt;
}