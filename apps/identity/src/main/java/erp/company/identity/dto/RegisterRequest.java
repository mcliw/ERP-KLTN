package erp.company.identity.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String id;           // UUID string từ HRM gửi sang
    private String employeeCode; // Mã nhân viên (VD: NV001)
    private String email;
    private String password;
    private String fullName;
    private String roleName;
    private String accountType;
}