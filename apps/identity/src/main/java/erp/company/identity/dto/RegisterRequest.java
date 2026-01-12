package erp.company.identity.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String roleName; // Ví dụ: "ADMIN"
    private String accountType;
}