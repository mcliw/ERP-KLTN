package erp.company.hrm.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentDTO {
    private Integer id;             // Mapping from departmentId
    private String code;            // Form: Mã phòng ban
    private String name;            // Form: Tên phòng ban
    private String description;     // Form: Mô tả
    private String status;          // Form: "Hoạt động" | "Ngưng hoạt động"
    
    // Fields cho Table/View
    private Integer managerId;
    private String managerName;     // Table: Trưởng phòng
    private Integer employeeCount;  // Table: Số NV
}