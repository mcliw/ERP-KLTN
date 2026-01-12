package erp.company.identity.services;

import erp.company.identity.dto.LoginRequest;
import erp.company.identity.dto.RegisterRequest;
import erp.company.identity.dto.AuthResponse;

public interface AuthService {
    // Phương thức Login chính
    AuthResponse login(LoginRequest request);

    // Phương thức tạo tài khoản tạm để có password đã hash
    void register(RegisterRequest request);
}