package erp.company.sales.services.impl;

import erp.company.sales.dto.CreateCustomerRequest;
import erp.company.sales.entity.Customer;
import erp.company.sales.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl { // Có thể implement Interface nếu muốn

    private final CustomerRepository customerRepository;

    @Transactional
    public void createCustomerFromIdentity(CreateCustomerRequest request) {
        // 1. LOGIC SINH MÃ KHÁCH HÀNG (KH + 5 số)
        String lastCode = customerRepository.findLastCustomerCode();
        String newCode = generateNextCode(lastCode);

        // 2. Map dữ liệu
        Customer customer = new Customer();
        customer.setId(request.getId());
        customer.setCode(newCode);
        customer.setFullName(request.getFullName());
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customer.setStatus("ACTIVE");
        customer.setCreatedAt(LocalDateTime.now());

        // 3. Lưu xuống DB
        customerRepository.save(customer);
    }

    // Hàm phụ trợ sinh mã
    private String generateNextCode(String lastCode) {
        if (lastCode == null || lastCode.isEmpty()) {
            return "KH00001";
        }
        // Giả sử mã luôn là KHxxxxx
        String numberPart = lastCode.substring(2); // Lấy phần số (00001)
        int number = Integer.parseInt(numberPart);
        number++;
        return String.format("KH%05d", number);
    }
}