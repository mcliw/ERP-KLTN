package erp.company.identity.services.Impl;

import erp.company.identity.constant.UserStatusConstant;
import erp.company.identity.dto.AuthResponse;
import erp.company.identity.dto.LoginRequest;
import erp.company.identity.dto.RegisterRequest;
import erp.company.identity.entity.RefreshToken;
import erp.company.identity.entity.Role;
import erp.company.identity.entity.User;
import erp.company.identity.repository.RefreshTokenRepository;
import erp.company.identity.repository.RoleRepository;
import erp.company.identity.repository.UserRepository;
import erp.company.identity.security.JwtUtil;
import erp.company.identity.services.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        // 1. Tìm user
        User user = userRepository.findByEmailAndAccountType(request.getEmail(), request.getAccountType())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại hoặc sai loại tài khoản"));

        // 2. Kiểm tra status
        if (!UserStatusConstant.ACTIVE.name().equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản đã bị khóa hoặc chưa kích hoạt");
        }

        // 3. Verify Password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Sai mật khẩu");
        }

        // 4. Cập nhật last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        // 5. Tạo Token và trả về
        return generateAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // 1. Validate Email (Check trùng trong cùng 1 AccountType)
        if (userRepository.findByEmailAndAccountType(request.getEmail(), request.getAccountType()).isPresent()) {
            throw new RuntimeException("Email: " + request.getEmail() + " đã tồn tại trong hệ thống với vai trò " + request.getAccountType());
        }

        // 2. Validate và lấy Role
        Role role = roleRepository.findByName(request.getRoleName())
                .orElseThrow(() -> new RuntimeException("Role không hợp lệ: " + request.getRoleName()));

        // 3. Tạo User Entity
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword())); // Hash mật khẩu
        user.setAccountType(request.getAccountType());
        user.setRole(role);
        user.setStatus(UserStatusConstant.ACTIVE.name()); // Mặc định Active khi đăng ký mới
        user.setCreatedAt(LocalDateTime.now());
        
        // 4. Lưu User xuống DB
        User savedUser = userRepository.save(user);

        // 5. Tự động đăng nhập (Tạo token) và trả về kết quả
        return generateAuthResponse(savedUser);
    }

    // --- Private Helper để tái sử dụng logic tạo Token ---
    private AuthResponse generateAuthResponse(User user) {
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshTokenStr = jwtUtil.generateRefreshToken(user);

        // Lưu Refresh Token vào DB
        saveRefreshToken(user, refreshTokenStr);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .tokenType("Bearer")
                .expiresIn(3600L) 
                .build();
    }

    private void saveRefreshToken(User user, String token) {
        // Có thể thêm logic thu hồi các token cũ nếu cần (Optional)
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(token);
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshToken.setCreatedAt(LocalDateTime.now());
        
        refreshTokenRepository.save(refreshToken);
    }
}