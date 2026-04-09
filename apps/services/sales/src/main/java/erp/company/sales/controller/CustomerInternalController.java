package erp.company.sales.controller;

import erp.company.sales.dto.CreateCustomerRequest;
import erp.company.sales.services.CustomerServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerInternalController {

    private final CustomerServiceImpl customerService;

    @PostMapping
    public void createCustomer(@RequestBody CreateCustomerRequest request) {
        // Gọi xuống Service để xử lý logic
        customerService.createCustomerFromIdentity(request);
    }
}