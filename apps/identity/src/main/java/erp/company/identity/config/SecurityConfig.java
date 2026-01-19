package erp.company.identity.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // --- THÊM FILTER NÀY ĐỂ DEBUG ---
            .addFilterBefore(new OncePerRequestFilter() {
                @Override
                protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                        throws ServletException, IOException {
                    System.out.println(">>> DEBUG SECURITY: Incoming Request");
                    System.out.println("   URI: " + request.getRequestURI());
                    System.out.println("   ContextPath: " + request.getContextPath());
                    System.out.println("   ServletPath: " + request.getServletPath());
                    filterChain.doFilter(request, response);
                }
            }, BasicAuthenticationFilter.class)
            // -------------------------------

            .authorizeHttpRequests(auth -> auth
                // Cấu hình lại matchers bao quát nhất
                .requestMatchers("/graphql/**", "/identity/graphql/**").permitAll()
                .requestMatchers("/graphiql/**", "/identity/graphiql/**").permitAll()
                .requestMatchers("/auth/**").permitAll()
                .anyRequest().authenticated() 
            );

        return http.build();
    }
}