package erp.company.sales.controller;

import erp.company.sales.dto.CustomerDTO;
import erp.company.sales.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Cho phép Frontend gọi API (tránh CORS error)
public class CustomerController {

    private final CustomerService customerService;

    // API: GET /customers?keyword=...&status=...&page=0&size=10
    // Khớp với: customerService.getAll() bên JS
    @GetMapping
    public ResponseEntity<Page<CustomerDTO>> getCustomers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable
    ) {
        Page<CustomerDTO> page = customerService.getCustomers(keyword, status, pageable);
        return ResponseEntity.ok(page);
    }

    // API: GET /customers/{id}
    // Khớp với: customerService.getById(id)
    @GetMapping("/{id}")
    public ResponseEntity<CustomerDTO> getCustomerById(@PathVariable UUID id) {
        CustomerDTO customer = customerService.getCustomerById(id);
        return ResponseEntity.ok(customer);
    }

    // API: POST /customers
    // Khớp với: customerService.create(data)
    @PostMapping
    public ResponseEntity<CustomerDTO> createCustomer(@Valid @RequestBody CustomerDTO customerDTO) {
        CustomerDTO created = customerService.createCustomer(customerDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // API: PUT /customers/{id}
    // Khớp với: customerService.update(id, data)
    @PutMapping("/{id}")
    public ResponseEntity<CustomerDTO> updateCustomer(
            @PathVariable UUID id,
            @Valid @RequestBody CustomerDTO customerDTO
    ) {
        CustomerDTO updated = customerService.updateCustomer(id, customerDTO);
        return ResponseEntity.ok(updated);
    }

    // API: DELETE /customers/{id} (Hoặc PUT /customers/{id} với payload soft delete từ FE)
    // Khớp với: customerService.remove(id)
    // Lưu ý: FE của bạn đang gửi PUT request để xóa mềm.
    // Nếu FE gửi method DELETE thực sự:
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomer(@PathVariable UUID id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.noContent().build();
    }
    
    // Nếu FE gửi PUT để xóa mềm (như trong file js), bạn có thể xử lý logic đó trong hàm updateCustomer
    // bằng cách check trường status = "INACTIVE" hoặc tạo endpoint riêng nếu cần.
}