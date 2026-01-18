package erp.company.hrm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. Tắt CSRF vì đây là REST API, không dùng session cookie truyền thống
            .csrf(AbstractHttpConfigurer::disable)

            // 2. Cấu hình quản lý Session là Stateless (không lưu trạng thái đăng nhập)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // 3. Cấu hình phân quyền (Authorization)
            .authorizeHttpRequests(auth -> auth
                // [QUAN TRỌNG] Cho phép các request bắt đầu bằng /internal/hrm/graphql/ đi qua mà KHÔNG cần xác thực.
                // Điều này giúp Identity Service gọi được API: /internal/hrm/graphql/employees/unlinked
                //.requestMatchers("/internal/hrm/graphql/**").permitAll()

                // Cho phép truy cập Swagger/OpenAPI (nếu có dùng để test)
                //.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .anyRequest().permitAll()
                // Các request thông thường (User gọi từ Gateway vào /api/employees...) 
                // thì VẪN PHẢI xác thực (Authenticated).
                // Lưu ý: Để dòng này hoạt động đúng, HRM cần có cơ chế validate JWT (JwtFilter).
                // Nếu HRM chưa có JwtFilter và bạn muốn tin tưởng Gateway tuyệt đối, 
                // hãy đổi .authenticated() thành .permitAll() tạm thời.    
                //.anyRequest().authenticated()
            );

        // Nếu bạn đã copy JwtFilter sang HRM, hãy bỏ comment dòng dưới đây:
        // http.addFilterBefore(jwtFilter, org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}