package erp.company.identity.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = jwtUtil.getClaims(token);
                String userId = claims.getSubject();
                String role = claims.get("role", String.class);
                String accountType = claims.get("account_type", String.class);
                List<String> permissions = claims.get("permissions", List.class);

                // Gộp Role và Permissions thành danh sách GrantedAuthority
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role)); // ROLE_ADMIN
                authorities.addAll(permissions.stream()
                        .map(SimpleGrantedAuthority::new)
                        .collect(Collectors.toList()));

                // Tạo đối tượng Authentication lưu kèm accountType trong Principal
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        userId, // principal là ID của user
                        accountType, // credentials hoặc lưu thông tin mở rộng ở đây
                        authorities
                );

                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception e) {
                // Token không hợp lệ hoặc hết hạn -> Không nạp context
            }
        }
        filterChain.doFilter(request, response);
    }
}