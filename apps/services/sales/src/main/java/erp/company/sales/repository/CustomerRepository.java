package erp.company.sales.repository;

import erp.company.sales.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    // Query để lấy mã khách hàng lớn nhất hiện tại (để sinh mã tiếp theo)
    @Query("SELECT c.code FROM Customer c ORDER BY c.code DESC LIMIT 1")
    String findLastCustomerCode();
}