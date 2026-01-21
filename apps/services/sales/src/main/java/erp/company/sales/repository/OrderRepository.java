package erp.company.sales.repository;

import erp.company.sales.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer>, JpaSpecificationExecutor<Order> {

    // Hỗ trợ xem lịch sử mua hàng của một khách hàng cụ thể (Customer Detail Page)
    List<Order> findByCustomerId(UUID customerId);

    // Hỗ trợ OrderFilter: Tìm theo mã đơn hàng (ID)
    // Vì ID là Integer nhưng keyword search là String, cần xử lý ở tầng Service/Spec
    // Tuy nhiên nếu cần tìm chính xác:
    // Optional<Order> findById(Integer id); // Đã có sẵn trong JpaRepository

    // Đếm số đơn hàng của khách (Hỗ trợ logic xếp hạng khách hàng nếu cần)
    long countByCustomerId(UUID customerId);
    
    // Hỗ trợ lấy đơn hàng mới nhất (Dashboard)
    // Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable); // Có thể dùng Sort trong Pageable
}