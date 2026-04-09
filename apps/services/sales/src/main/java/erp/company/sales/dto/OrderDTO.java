package erp.company.sales.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class OrderDTO {
    private Integer id;

    // Layout: OrderForm - Chọn khách hàng CRM
    private String customerId; // UUID hoặc Integer tùy strategy, ở đây map theo CustomerDTO

    // Layout: OrderForm - Phương thức thanh toán (COD, MOMO...)
    private String paymentMethod;

    // Layout: OrderForm - Địa chỉ giao hàng
    private String shippingAddress;

    // Layout: OrderForm - Trạng thái (PENDING, SHIPPING...)
    private String orderStatus;

    // Layout: OrderTable - Ngày tạo
    private LocalDateTime createdAt;
    
    // Layout: OrderForm - Tổng tiền (Frontend tính toán hiển thị, Backend cần tính lại để lưu)
    private BigDecimal totalAmount;

    // Layout: OrderForm - Danh sách sản phẩm
    private List<OrderItemDTO> items;

    @Data
    public static class OrderItemDTO {
        private Integer productVariantId;
        private Integer quantity;
        private BigDecimal price; // Giá tại thời điểm bán
    }
}