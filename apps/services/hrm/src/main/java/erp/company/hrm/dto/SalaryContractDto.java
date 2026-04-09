package erp.company.hrm.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryContractDTO {
    private Integer id;                 // contractId
    private Integer employeeId;         // Form: employeeId
    private String employeeCode;        // Table: hiển thị
    private String employeeName;        // Table: hiển thị

    private BigDecimal baseSalary;      // Form: Lương cơ bản
    private BigDecimal allowance;       // Form: Phụ cấp
    private BigDecimal insuranceSalary; // Form: Mức đóng bảo hiểm
    
    private LocalDate effectiveDate;    // Form: Ngày hiệu lực
    
    // Form có 3 trạng thái: "Dự thảo", "Hiệu lực", "Hết hạn". 
    // Entity hiện tại chỉ có Boolean is_active -> Cần sửa Entity/DB
    private String status;              
}