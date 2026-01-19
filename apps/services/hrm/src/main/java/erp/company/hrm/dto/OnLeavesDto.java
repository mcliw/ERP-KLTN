package erp.company.hrm.dto;

import erp.company.hrm.entity.enums.LeaveStatus;
import erp.company.hrm.entity.enums.LeaveType;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnLeavesDto {
    private Integer requestId;
    private String employeeId; // Mapping từ Employee entity
    private String employeeName; // Thêm trường này để tiện hiển thị FE
    private LocalDate startDate;
    private LocalDate endDate;
    private LeaveType leaveType;
    private String reason;
    private LeaveStatus status;
    private String approverId; // Mapping từ Employee approver
    private String rejectionReason;
    
    // BaseEntity fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
}