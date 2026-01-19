package erp.company.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalariesDto {
    private Long payslipId;
    private Long employeeId;
    private String employeeName;
    private String departmentName;
    private String positionName;
    
    private Integer month;
    private Integer year;
    
    private Double standardWorkDays; // Số ngày công chuẩn trong tháng
    private Double actualWorkDays;   // Số ngày công thực tế đi làm
    private Double leavePaidDays;    // Số ngày nghỉ có lương
    
    private BigDecimal grossSalary;       // Lương gộp
    private BigDecimal taxDeduction;      // Khấu trừ thuế
    private BigDecimal insuranceDeduction; // Khấu trừ bảo hiểm
    private BigDecimal advancePayment;    // Tạm ứng
    private BigDecimal netSalary;         // Thực lĩnh
    
    private Boolean status; // true: Đã chốt/đã trả, false: Nháp
}