package erp.company.identity.entity;

import java.time.LocalDateTime;

import java.util.UUID;

import erp.company.identity.constant.UserStatusConstant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(length = 50)
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name ="last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "account_type", length = 50)
    private String accountType;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;
}
