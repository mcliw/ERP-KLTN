package erp.company.identity.services.Impl;

import erp.company.identity.constant.UserStatusConstant;
import erp.company.identity.dto.LoginRequest;
import erp.company.identity.dto.RegisterRequest;
import erp.company.identity.dto.AuthResponse;
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
@RequiredArgsConstructor // Tự động inject các final dependencies
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RoleRepository roleRepository; // Cần để tìm role khi register
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        // 1. Tìm user theo Email và AccountType (tránh nhầm lẫn giữa Employee và Customer)
        User user = userRepository.findByEmailAndAccountType(request.getEmail(), request.getAccountType())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại hoặc sai loại tài khoản"));

        // 2. Kiểm tra trạng thái User (Active/Blocked?)
        if (!UserStatusConstant.ACTIVE.name().equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản đã bị khóa hoặc chưa kích hoạt");
        }

        // 3. Kiểm tra mật khẩu (So sánh hash)
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Sai mật khẩu");
        }

        // 4. Sinh Token
        String accessToken = jwtUtil.generateAccessToken(user);
        String refreshTokenStr = jwtUtil.generateRefreshToken(user);

        // 5. Lưu Refresh Token vào DB (để quản lý phiên đăng nhập)
        saveRefreshToken(user, refreshTokenStr);

        // 6. Cập nhật lần đăng nhập cuối
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .tokenType("Bearer")
                .expiresIn(3600L) // Ví dụ 1 giờ
                .build();
    }

    @Override
    @Transactional
    public void register(RegisterRequest request) {
        // Kiểm tra email tồn tại
        if (userRepository.findByEmailAndAccountType(request.getEmail(), request.getAccountType()).isPresent()) {
            throw new RuntimeException("Email đã tồn tại");
        }

        // Lấy Role từ DB (Giả sử bạn đã seed data cho bảng roles)
        Role role = roleRepository.findByName(request.getRoleName())
                .orElseThrow(() -> new RuntimeException("Role không hợp lệ"));

        User user = new User();
        user.setEmail(request.getEmail());
        // QUAN TRỌNG: Hash mật khẩu trước khi lưu
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setAccountType(request.getAccountType());
        user.setRole(role);
        user.setStatus(UserStatusConstant.ACTIVE.name());
        user.setCreatedAt(LocalDateTime.now());

        userRepository.save(user);
    }

    private void saveRefreshToken(User user, String token) {
        // Xóa token cũ nếu chỉ cho phép 1 thiết bị đăng nhập (tùy nghiệp vụ)
        // refreshTokenRepository.deleteByUser(user); 

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(token);
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(7)); // Hết hạn sau 7 ngày
        refreshToken.setCreatedAt(LocalDateTime.now());
        
        refreshTokenRepository.save(refreshToken);
    }
}