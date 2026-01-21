package erp.company.sales.service;

import erp.company.sales.dto.OrderDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface OrderService {

    /**
     * Phục vụ: OrderFilter.jsx & OrderTable.jsx
     * Chức năng: Lấy danh sách đơn hàng, hỗ trợ tìm kiếm đa tiêu chí (Keyword, Customer, Status, Payment).
     */
    Page<OrderDTO> getOrders(String keyword, UUID customerId, String status, String paymentMethod, Pageable pageable);

    /**
     * Phục vụ: OrderForm.jsx (Mode = View/Edit)
     * Chức năng: Lấy chi tiết đơn hàng bao gồm danh sách sản phẩm (Items) để hiển thị.
     */
    OrderDTO getOrderById(Integer id);

    /**
     * Phục vụ: OrderForm.jsx (Mode = Create)
     * Chức năng: Tạo đơn hàng mới.
     * Nhiệm vụ Impl: Tính toán tổng tiền, lưu OrderDetail, trừ tồn kho (gọi ProductService).
     */
    OrderDTO createOrder(OrderDTO orderDTO);

    /**
     * Phục vụ: OrderForm.jsx (Mode = Edit)
     * Chức năng: Cập nhật thông tin đơn hàng (thường là cập nhật Trạng thái, Địa chỉ giao hàng).
     */
    OrderDTO updateOrder(Integer id, OrderDTO orderDTO);

    /**
     * Phục vụ: OrderTable.jsx (Logic hiển thị trạng thái) hoặc chức năng Duyệt nhanh
     * Chức năng: Chỉ cập nhật trạng thái đơn hàng (VD: PENDING -> SHIPPING).
     */
    void updateOrderStatus(Integer id, String status);

    /**
     * Phục vụ: Chức năng Hủy đơn (Soft Delete hoặc chuyển trạng thái CANCELLED)
     */
    void deleteOrder(Integer id);
    
    /**
     * Phục vụ: Tab lịch sử mua hàng trong Customer Detail (Nếu có)
     */
    Page<OrderDTO> getOrdersByCustomer(UUID customerId, Pageable pageable);
}