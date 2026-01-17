package erp.company.identity;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class IdentityApplication {

    public static void main(String[] args) {
        // Nạp file .env vào System Properties
        Dotenv dotenv = Dotenv.configure()
                .directory("./") // Đường dẫn đến thư mục chứa file .env
                .ignoreIfMissing()
                .load();

        dotenv.entries().forEach(entry -> 
            System.setProperty(entry.getKey(), entry.getValue())
        );

        SpringApplication.run(IdentityApplication.class, args);
    }
}