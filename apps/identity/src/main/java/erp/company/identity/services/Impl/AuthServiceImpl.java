package erp.company.identity.services.Impl;

import erp.company.identity.dto.AuthResponse;
import erp.company.identity.dto.LoginRequest;
import erp.company.identity.dto.RegisterRequest;
import erp.company.identity.entity.Role;
import erp.company.identity.entity.User;
import erp.company.identity.repository.RoleRepository;
import erp.company.identity.repository.UserRepository;
import erp.company.identity.security.JwtUtil;
import erp.company.identity.services.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        String roleName = request.getRoleName() != null ? request.getRoleName() : "CUSTOMER";
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));

        // [LOGIC MỚI] Xử lý ID liên kết
        // Nếu có ID gửi lên (từ HRM) thì dùng, không thì tạo mới (cho user vãng lai)
        UUID userId = request.getId() != null ? request.getId() : UUID.randomUUID();

        User user = User.builder()
                .id(userId) // SET ID THỦ CÔNG
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .status("ACTIVE")
                .role(role)
                .accountType("INTERNAL") // Mặc định là Internal nếu tạo qua form này
                .createdAt(LocalDateTime.now())
                .build();

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request, String sourceHost) {
        // Tìm user theo Email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Wrong account or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Wrong account or password");
        }

        // Kiểm tra domain (Bảo mật)
        boolean isInternal = "INTERNAL".equalsIgnoreCase(user.getAccountType());
        boolean isExternal = "EXTERNAL".equalsIgnoreCase(user.getAccountType());
        
        String host = sourceHost != null ? sourceHost.split(":")[0] : "";

        if (isInternal && !host.equals("ldgcompany.local")) {
           // throw new RuntimeException("Internal accounts must login via ldgcompany.local");
           // Tạm comment để dễ test local, uncomment khi chạy production
        }

        String token = jwtUtil.generateToken(user);
        
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return AuthResponse.builder()
                .accessToken(token)
                .expiresIn(86400L) // Khớp với cấu hình yaml
                .tokenType("Bearer")
                .build();
    }
}