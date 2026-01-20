package erp.company.sales.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "customers")
@Data
public class Customer {
    @Id
    private UUID id; // Dùng chung ID với Identity

    @Column(unique = true)
    private String code; // Mã KH tự sinh (KH00001)

    private String fullName;
    private String email;
    private String phone;
    private String address;
    private String status;
    private LocalDateTime createdAt;
}