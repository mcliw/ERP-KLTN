package erp.company.identity.integration;

import erp.company.identity.dto.RegisterRequest;
import org.springframework.stereotype.Component;
import java.util.UUID;

@Component
public class CrmClient {

    // Đây là nơi bạn cấu hình RestTemplate hoặc WebClient để gọi API của Sales & CRM Service
    // Endpoint ví dụ: POST http://sales-crm-service/api/customers
    public void createCustomerProfile(UUID userId, RegisterRequest request) {
        // Body gửi đi: { "id": userId, "fullName": request.getFullName(), ... }
        
        System.out.println(">>> Calling CRM Service to create Profile for ID: " + userId);
        System.out.println(">>> Data: " + request.getFullName() + " | " + request.getPhone());
        
        // Logic thực tế:
        // restTemplate.postForObject(crmUrl, customerDto, Void.class);
    }
}