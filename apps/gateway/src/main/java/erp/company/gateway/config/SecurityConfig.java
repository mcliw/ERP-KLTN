package erp.company.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import reactor.core.publisher.Mono;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;

@Configuration
@EnableWebFluxSecurity // Bắt buộc dùng Annotation này cho Gateway, KHÔNG dùng @EnableWebSecurity
public class SecurityConfig {

    private final String jwkSetUri = "http://localhost:8080/oauth2/jwks"; // Thay bằng URL thật của Identity Service

        @Bean
        public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
            http
                // 1. Tắt CSRF (Bắt buộc cho API, nếu không POST sẽ bị chặn)
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                
                // 2. Cấu hình quyền truy cập
                .authorizeExchange(exchanges -> exchanges
                    // Cho phép phương thức OPTIONS (CORS pre-flight request từ trình duyệt)
                    .pathMatchers(HttpMethod.OPTIONS).permitAll()
                    
                    // QUAN TRỌNG: Cho phép truy cập Login/Register mà không cần Token
                    // Lưu ý: Gateway nhìn thấy path CÓ prefix /api, nên phải whitelist cả /api/...
                    .pathMatchers("/api/identity/**").permitAll() 
                    .pathMatchers("/api/identity/graphql").permitAll()
                    
                    // Các service khác bắt buộc phải có Token
                    .anyExchange().permitAll()
                    //.anyExchange().authenticated()
                );
                
                // 3. Cấu hình Resource Server (Validate Token)
/*                .oauth2ResourceServer(oauth2 -> oauth2
                    .jwt(jwt -> jwt
                        .jwtDecoder(jwtDecoder())
                        .jwtAuthenticationConverter(jwtAuthenticationConverter())
                    )
                ); */

            return http.build();
        }

    // Bean giải mã Token (Fix lỗi ReactiveJwtDecoder missing)
    @Bean
    public ReactiveJwtDecoder jwtDecoder() {
        return NimbusReactiveJwtDecoder.withJwkSetUri(jwkSetUri).build();
    }

    // Bean chuyển đổi Token thành User (Fix lỗi JwtAuthenticationToken missing)
    @Bean
    public Converter<Jwt, Mono<AbstractAuthenticationToken>> jwtAuthenticationConverter() {
        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        // Cấu hình thêm nếu cần (ví dụ map roles từ claim)
        return new ReactiveJwtAuthenticationConverterAdapter(jwtAuthenticationConverter);
    }
}