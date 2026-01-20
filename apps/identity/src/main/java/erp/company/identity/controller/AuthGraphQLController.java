package erp.company.identity.controller;

import erp.company.identity.dto.AuthResponse;
import erp.company.identity.dto.LoginRequest;
import erp.company.identity.dto.RegisterRequest;
import erp.company.identity.entity.User;
import erp.company.identity.services.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

@Controller
@RequiredArgsConstructor
public class AuthGraphQLController {

    private final AuthService authService;

    // Helper method để lấy Host từ Request
    private String getClientHost() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes) {
            HttpServletRequest request = ((ServletRequestAttributes) attributes).getRequest();
            String host = request.getHeader("X-Forwarded-Host");
            if (host == null) {
                host = request.getHeader("Host");
            }
            return host != null ? host : "";
        }
        return "";
    }

    @MutationMapping
    public User register(@Argument RegisterRequest input) { 
        // [UPDATE] Truyền thêm host vào service register
        String host = getClientHost();
        return authService.register(input, host); 
    }

    @MutationMapping
    public AuthResponse login(@Argument LoginRequest input) {
        // [UPDATE] Sử dụng helper method
        String host = getClientHost();
        return authService.login(input, host);
    }

    @QueryMapping
    public String ping() {
        return "Identity Service is Online!";
    }
    
    @QueryMapping
    public User me() {
        User user = new User();
        user.setEmail("admin@example.com");
        return user;
    }
}