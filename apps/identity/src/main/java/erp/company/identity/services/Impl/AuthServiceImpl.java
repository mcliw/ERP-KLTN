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
import erp.company.identity.integration.CrmClient;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CrmClient crmClient;

    // Helper: Chuẩn hóa host (bỏ port nếu có)
    private String normalizeHost(String host) {
        return host != null ? host.split(":")[0].toLowerCase() : "";
    }

    @Override
    @Transactional(rollbackFor = Exception.class) // Rollback nếu gọi CRM thất bại
    public User register(RegisterRequest request, String sourceHost) {
        String cleanHost = normalizeHost(sourceHost);
        boolean isStoreUser = "store.local".equals(cleanHost);

        // 1. Phân luồng Role & Type
        if (isStoreUser) {
            request.setRoleName("CUSTOMER");
            request.setAccountType("EXTERNAL");
        } else if ("ldgcompany.local".equals(cleanHost)) {
            if (request.getAccountType() == null) request.setAccountType("INTERNAL");
        }

        // 2. Validate Email
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        // 3. Xử lý ID
        // Nếu là Store (External) -> Luôn tạo mới UUID random
        // Nếu là Internal -> Có thể lấy ID từ request (do HRM gửi sang) hoặc tạo mới
        UUID userId = request.getId();
        if (userId == null || isStoreUser) {
            userId = UUID.randomUUID();
        }

        // 4. Lưu User vào Identity DB
        String roleName = request.getRoleName() != null ? request.getRoleName() : "CUSTOMER";
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));

        User user = User.builder()
                .id(userId) 
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .status("ACTIVE")
                .role(role)
                .accountType(request.getAccountType())
                .createdAt(LocalDateTime.now())
                .build();

        User savedUser = userRepository.save(user);

        // 5. [LOGIC ĐỒNG BỘ] Gọi sang CRM Service nếu là Store User
        if (isStoreUser) {
            try {
                // Gửi data sang CRM để tạo Customer Profile
                crmClient.createCustomerProfile(userId, request);
            } catch (Exception e) {
                // Quan trọng: Nếu tạo CRM lỗi, phải rollback lại việc tạo User ở Identity
                throw new RuntimeException("Failed to create CRM profile: " + e.getMessage());
            }
        }

        return savedUser;
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request, String sourceHost) {
        // Tìm user theo Email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Wrong account or password"));

        // Kiểm tra Password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Wrong account or password");
        }

        // [LOGIC MỚI] Phân luồng Đăng Nhập
        String cleanHost = normalizeHost(sourceHost);
        boolean isInternalAccount = "INTERNAL".equalsIgnoreCase(user.getAccountType());
        boolean isExternalAccount = "EXTERNAL".equalsIgnoreCase(user.getAccountType());

        // Rule 1: Tại store.local, chỉ cho phép EXTERNAL
        if ("store.local".equals(cleanHost)) {
            if (!isExternalAccount) {
                // User tồn tại & pass đúng NHƯNG sai môi trường -> Báo lỗi chung chung
                throw new RuntimeException("Wrong account or password");
            }
        }
        
        // Rule 2: Tại ldgcompany.local, chỉ cho phép INTERNAL
        if ("ldgcompany.local".equals(cleanHost)) {
            if (!isInternalAccount) {
                 // User tồn tại & pass đúng NHƯNG sai môi trường -> Báo lỗi chung chung
                throw new RuntimeException("Wrong account or password");
            }
        }

        // Tạo Token
        String token = jwtUtil.generateToken(user);
        
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return AuthResponse.builder()
                .accessToken(token)
                .expiresIn(86400L)
                .tokenType("Bearer")
                .build();
    }

    @Override
    public User register(RegisterRequest request) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'register'");
    }
}