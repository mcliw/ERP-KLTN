// File: identity/src/main/java/erp/company/identity/services/remote/HrmClient.java
package erp.company.identity.services.remote;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class HrmClient {
    
    private final RestTemplate restTemplate;
    // URL này là tên service trong Docker Compose hoặc K8s, không qua Gateway
    private final String HRM_SERVICE_URL = "http://hrm-service:8080/internal/api/employees"; 

    public void confirmUserLinked(String employeeCode) {
        String url = HRM_SERVICE_URL + "/" + employeeCode + "/link-success";
        restTemplate.postForEntity(url, null, Void.class);
    }
}