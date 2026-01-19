package erp.company.hrm.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveRequestDTO {
    private Integer id;             // requestId
    private String employeeCode;    // Form & Table
    private String employeeName;    // Form & Table
    
    private String departmentName;  // Table
    private String positionName;    // Table
    
    private String leaveType;       // Form: Loại nghỉ
    private LocalDate fromDate;     // Form: Từ ngày
    private LocalDate toDate;       // Form: Đến ngày
    private String reason;          // Form: Lý do
    
    private String status;          // Form: Trạng thái (Chờ duyệt, Đã duyệt...)
    private String approverName;    // Logic backend xử lý
}