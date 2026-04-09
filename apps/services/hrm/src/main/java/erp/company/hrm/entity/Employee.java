package erp.company.hrm.entity;

import erp.company.hrm.entity.enums.EmployeeStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employee_id")
    private Integer employeeId;

    @Column(name = "employee_code", unique = true, nullable = false)
    private String employeeCode;
    
    // Status này là string (YET...), logic business có thể dùng riêng
    private String status;
    
    // Ánh xạ UUID sang bảng Account
    @Column(name = "account_id", columnDefinition = "uuid")
    private UUID accountId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(unique = true, nullable = false)
    private String email;

    private String phone;
    private LocalDate birthday;
    private String gender;
    
    @Column(name = "identity_card")
    private String identityCard;
    
    private String hometown;
    private String address;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "position_id")
    private Position position;

    @Column(name = "join_date", nullable = false)
    private LocalDate joinDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_empl")
    private EmployeeStatus statusEmpl;

    // --- Banking Info ---
    @Column(name = "bank_name")
    private String bankName;
    
    @Column(name = "bank_account_number")
    private String bankAccountNumber;

    // [NEW] Bổ sung tên chủ tài khoản theo yêu cầu Frontend
    @Column(name = "bank_account_name")
    private String bankAccountName;

    @Column(name = "avatar_url")
    private String avatarUrl;
}