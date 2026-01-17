package erp.company.identity;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordGenerator {
    public static void main(String[] args) {
        // 1. Khởi tạo Encoder (Strength mặc định là 10)
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        // 2. Nhập mật khẩu gốc (Plain text)
        String rawPassword = "123"; // Thay đổi mật khẩu gốc tại đây

        // 3. Tạo Hash
        String hashedPassword = encoder.encode(rawPassword);

        // 4. In kết quả ra màn hình console
        System.out.println("=== COPY DÒNG DƯỚI ĐỂ INSERT VÀO DB ===");
        System.out.println("Mật khẩu gốc: " + rawPassword);
        System.out.println("Mật khẩu Hash: " + hashedPassword);
        
        // Kiểm tra lại (Demo verify)
        boolean isMatch = encoder.matches("123", hashedPassword);
        System.out.println("Kết quả verify: " + isMatch);
    }
}