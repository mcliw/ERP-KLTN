package erp.company.sales.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class CreateCustomerRequest {
    private UUID id;        // Khớp với ID bên Identity
    private String email;
    private String fullName;
    private String phone;
    private String address;
}