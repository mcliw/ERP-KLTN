package erp.company.sales.repository;

import erp.company.sales.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> , JpaSpecificationExecutor<Customer>{
    // Query để lấy mã khách hàng lớn nhất hiện tại (để sinh mã tiếp theo)
    @Query("SELECT c.code FROM Customer c ORDER BY c.code DESC LIMIT 1")
    String findLastCustomerCode();

    // Hỗ trợ CustomerForm: Kiểm tra trùng mã khách hàng khi tạo mới/cập nhật
    boolean existsByCode(String code);

    // Hỗ trợ CustomerForm: Kiểm tra trùng email
    boolean existsByEmail(String email);

    // Hỗ trợ CustomerForm (Edit): Kiểm tra trùng mã nhưng ngoại trừ ID hiện tại
    boolean existsByCodeAndIdNot(String code, UUID id);

    // Hỗ trợ CustomerTable + Filter:
    // Mặc định findAll(Specification, Pageable) đã có sẵn nhờ JpaSpecificationExecutor
    // Giúp lọc theo: (Name OR Code OR Phone) AND Status AND DeletedAt IS NULL
}