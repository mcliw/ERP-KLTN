package erp.company.hrm.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class EmployeeDto {
    private Integer id;           // Map từ employeeId
    private String code;          // Map từ employeeCode
    private String name;          // Map từ fullName
    private String gender;
    private LocalDate dob;        // Map từ birthday
    private String email;
    private String phone;
    private String department;    // Chỉ lấy Code của phòng ban
    private String position;      // Chỉ lấy Code của vị trí
    private String status;        // Map từ Enum sang String hiển thị
    private String avatarUrl;
    private LocalDate joinDate;
    private String hometown;
    private String cccd;          // Map từ identityCard
    private String bankAccount;   // Map từ bankAccountNumber
    private String bankAccountName; // Tên chủ tài khoản (thường là fullName viết hoa)
}