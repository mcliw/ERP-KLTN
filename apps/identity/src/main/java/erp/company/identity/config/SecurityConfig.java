package erp.company.identity.config;

import erp.company.identity.security.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Kích hoạt @PreAuthorize trong Controller
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    // Bean mã hóa mật khẩu (BCrypt)
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Cấu hình chuỗi lọc bảo mật (Security Filter Chain)
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 1. Tắt CSRF vì chúng ta dùng JWT (Stateless)
            .csrf(AbstractHttpConfigurer::disable)
            
            // 2. Cấu hình Session là Stateless (Không lưu session phía server)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 3. Phân quyền truy cập (Authorize Requests)
            .authorizeHttpRequests(auth -> auth
                // Cho phép truy cập công khai vào endpoint GraphQL (Login/Register nằm ở đây)
                .requestMatchers("/identity/graphql/**").permitAll()
                
                // Cho phép truy cập công khai vào giao diện test GraphiQL (nếu bật)
                .requestMatchers("/identity/graphiql/**").permitAll()
                
                // Cho phép các endpoint Actuator (Health check) nếu có dùng
                .requestMatchers("/actuator/**").permitAll()
                
                // Tất cả các request còn lại bắt buộc phải có Token hợp lệ
                .anyRequest().authenticated()
            )
            
            // 4. Thêm JwtFilter vào trước UsernamePasswordAuthenticationFilter
            // Để nó chặn và kiểm tra Token trước khi Spring xử lý đăng nhập
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}