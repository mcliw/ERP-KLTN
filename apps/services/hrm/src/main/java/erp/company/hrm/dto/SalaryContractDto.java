package erp.company.hrm.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryContractDto {
    private Integer contractId;
    private String employeeId;
    private String employeeName;
    private BigDecimal baseSalary;
    private BigDecimal allowance;
    private BigDecimal insuranceSalary;
    private LocalDate effectiveDate;
    private Boolean isActive;

    // BaseEntity fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}