package erp.company.hrm.dto;

import lombok.*;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountDTO {
    private UUID accountId;         // Link với Employee
    private String username;        // Table
    private String email;           // Form
    private String password;        // Form (Write only)
    private String role;            // Form
    private String status;          // Form (Active/Inactive)
    
    // Thông tin nhân viên đi kèm
    private Integer employeeId;     // Form select
    private String employeeName;    // Table
    private String departmentName;  // Table
    private String positionName;    // Table
}