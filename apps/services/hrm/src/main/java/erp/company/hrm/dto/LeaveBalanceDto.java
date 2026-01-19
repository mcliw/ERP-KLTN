package erp.company.hrm.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveBalanceDto {
    private Integer balanceId;
    private String employeeId;
    private String employeeName;
    private Integer year;
    private Double totalEntitlement;
    private Double used;
    private Double remaining;
}