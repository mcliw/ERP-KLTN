package erp.company.identity.services;

import erp.company.identity.dto.AuthResponse;
import erp.company.identity.dto.LoginRequest;
import erp.company.identity.dto.RegisterRequest;
import erp.company.identity.entity.User;

public interface AuthService {
    AuthResponse login(LoginRequest request, String sourceHost); // Thêm tham số sourceHost
    User register(RegisterRequest request); // Đổi kiểu trả về thành User
    User register(RegisterRequest request, String sourceHost);
}