package erp.company.sales.service.impl;

import erp.company.sales.dto.CreateCustomerRequest;
import erp.company.sales.entity.Customer;
import erp.company.sales.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import erp.company.sales.dto.CustomerDTO;
import erp.company.sales.service.CustomerService;
import erp.company.sales.specification.CustomerSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService { // Có thể implement Interface nếu muốn

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

    @Override
    public Page<CustomerDTO> getCustomers(String keyword, String status, Pageable pageable) {
        // 1. Tạo Specification từ filter
        Specification<Customer> spec = CustomerSpecification.filter(keyword, status);
        
        // 2. Query DB
        Page<Customer> customers = customerRepository.findAll(spec, pageable);

        // 3. Map Entity sang DTO
        return customers.map(this::toDTO);
    }

    @Override
    public List<CustomerDTO> getAllCustomersForSelection() {
        // Lấy tất cả khách hàng đang hoạt động để hiển thị Dropdown
        // Logic: Status = ACTIVE và chưa bị xóa
        Specification<Customer> spec = CustomerSpecification.filter(null, "ACTIVE");
        List<Customer> customers = customerRepository.findAll(spec);
        return customers.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public CustomerDTO getCustomerById(UUID id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng với ID: " + id));
        return toDTO(customer);
    }

    @Override
    @Transactional
    public CustomerDTO createCustomer(CustomerDTO dto) {
        // Validate nghiệp vụ
        if (customerRepository.existsByCode(dto.getCode())) {
            throw new RuntimeException("Mã khách hàng (Code) đã tồn tại: " + dto.getCode());
        }
        if (customerRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("Email đã tồn tại: " + dto.getEmail());
        }

        Customer entity = toEntity(dto);
        // Set mặc định
        entity.setCreatedAt(LocalDateTime.now());
        entity.setStatus(dto.getStatus() != null ? dto.getStatus() : "ACTIVE");

        Customer saved = customerRepository.save(entity);
        return toDTO(saved);
    }

    @Override
    @Transactional
    public CustomerDTO updateCustomer(UUID id, CustomerDTO dto) {
        Customer current = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));

        // Validate unique code nếu có thay đổi (trừ chính nó)
        if (!current.getCode().equals(dto.getCode()) && customerRepository.existsByCodeAndIdNot(dto.getCode(), id)) {
            throw new RuntimeException("Mã khách hàng đã được sử dụng bởi người khác");
        }

        // Cập nhật dữ liệu
        current.setFullName(dto.getFullName());
        current.setPhone(dto.getPhone());
        current.setEmail(dto.getEmail());
        current.setAddress(dto.getAddress());
        current.setStatus(dto.getStatus());
        current.setUpdatedAt(LocalDateTime.now());

        Customer saved = customerRepository.save(current);
        return toDTO(saved);
    }

    @Override
    @Transactional
    public void deleteCustomer(UUID id) {
        Customer current = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khách hàng"));
        
        // Soft Delete
        current.setDeletedAt(LocalDateTime.now());
        current.setStatus("INACTIVE"); // Chuyển trạng thái
        customerRepository.save(current);
    }

    // --- Mappers Helper ---
    private CustomerDTO toDTO(Customer entity) {
        CustomerDTO dto = new CustomerDTO();
        dto.setId(entity.getId());
        dto.setCode(entity.getCode());
        dto.setFullName(entity.getFullName());
        dto.setEmail(entity.getEmail());
        dto.setPhone(entity.getPhone());
        dto.setAddress(entity.getAddress());
        dto.setStatus(entity.getStatus());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }

    private Customer toEntity(CustomerDTO dto) {
        Customer entity = new Customer();
        entity.setCode(dto.getCode());
        entity.setFullName(dto.getFullName());
        entity.setEmail(dto.getEmail());
        entity.setPhone(dto.getPhone());
        entity.setAddress(dto.getAddress());
        return entity;
    }
}

