package erp.company.identity.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class RegisterRequest {
    private UUID id;
    private String email;
    private String password;
    private String roleName;
    private String accountType; // INTERNAL/EXTERNAL

    // [NEW] Fields for CRM synchronization
    private String fullName;
    private String phone;
    private String address;
}