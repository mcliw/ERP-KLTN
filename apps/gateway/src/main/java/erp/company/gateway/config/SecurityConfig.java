package erp.company.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Configuration
public class SecurityConfig {

    @Value("${JWT_SECRET:DayLaMotCaiKeyBiMatRatDaiDeTest1234567890!@#$%}") // Default nếu không có .env
    private String jwtSecret;

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .cors(ServerHttpSecurity.CorsSpec::disable)
            .authorizeExchange(exchanges -> exchanges
                // 1. Cho phép truy cập tự do vào Identity Service (để Login/Register/Lấy Token)
                .pathMatchers("/api/identity/**").permitAll()
                
                // 2. Các trang tĩnh hoặc Health check (nếu có)
                .pathMatchers("/actuator/**").permitAll()

                // 3. TẤT CẢ các API còn lại (HRM, Sales,...) BẮT BUỘC phải có Token hợp lệ
                .anyExchange().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtDecoder(jwtDecoder()))
            )
            .build();
    }

    // Bean giải mã Token dùng thuật toán HMAC (Symmetric Key)
    @Bean
    public ReactiveJwtDecoder jwtDecoder() {
        SecretKeySpec secretKey = new SecretKeySpec(
                jwtSecret.getBytes(StandardCharsets.UTF_8), 
                "HmacSHA512" // Hoặc HmacSHA256 tùy vào Identity Service đang dùng gì
        );
        return NimbusReactiveJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS512)
                .build();
    }
}