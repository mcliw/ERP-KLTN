package erp.company.identity.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import erp.company.identity.entity.User;
import erp.company.identity.entity.Permission;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class JwtUtil {

    // Trong thực tế, hãy lưu các giá trị này vào application.properties
    private static final String SECRET_KEY = "my-super-secret-key-which-is-very-long-and-secure-erp-system"; 
    private static final long ACCESS_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 giờ
    private static final long REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 ngày

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    }

    public String generateAccessToken(User user) {
        // Lấy danh sách permission code
        List<String> permissions = user.getRole().getPermissions().stream()
                .map(Permission::getName)
                .collect(Collectors.toList());

        return Jwts.builder()
                .setSubject(user.getId().toString()) // sub
                .claim("email", user.getEmail())
                .claim("role", user.getRole().getName())
                .claim("permissions", permissions) // Thêm danh sách quyền
                .claim("account_type", user.getAccountType())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + ACCESS_TOKEN_EXPIRY))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(User user) {
        // Tạo jti ngẫu nhiên để định danh token (dùng cho việc revoke sau này)
        String jti = UUID.randomUUID().toString();

        return Jwts.builder()
                .setSubject(user.getId().toString())
                .setId(jti) // jti
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + REFRESH_TOKEN_EXPIRY))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // Các phương thức hỗ trợ khác
    public Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}