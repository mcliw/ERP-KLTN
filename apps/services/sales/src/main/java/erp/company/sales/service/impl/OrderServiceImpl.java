package erp.company.sales.service.impl;

import erp.company.sales.dto.OrderDTO;
import erp.company.sales.entity.Customer;
import erp.company.sales.entity.Order;
import erp.company.sales.entity.OrderDetail;
import erp.company.sales.repository.CustomerRepository;
import erp.company.sales.repository.OrderRepository;
import erp.company.sales.service.OrderService;
import erp.company.sales.specification.OrderSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;

    // Nếu có ProductService (Feign Client) thì inject vào đây để check giá/tồn kho
    // private final ProductClient productClient; 

    @Override
    @Transactional(readOnly = true)
    public Page<OrderDTO> getOrders(String keyword, UUID customerId, String status, String paymentMethod, Pageable pageable) {
        Specification<Order> spec = OrderSpecification.filter(keyword, customerId, status, paymentMethod);
        Page<Order> orders = orderRepository.findAll(spec, pageable);
        return orders.map(this::toDTO);
    }

    @Override
    public OrderDTO getOrderById(Integer id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại: " + id));
        return toDTO(order);
    }
    
    @Override
    public Page<OrderDTO> getOrdersByCustomer(UUID customerId, Pageable pageable) {
         // Logic lọc đơn hàng theo customerId
         return getOrders(null, customerId, null, null, pageable);
    }

    @Override
    @Transactional
    public OrderDTO createOrder(OrderDTO dto) {
        // 1. Kiểm tra khách hàng
        Customer customer = null;
        if (dto.getCustomerId() != null) {
            customer = customerRepository.findById(UUID.fromString(dto.getCustomerId()))
                    .orElseThrow(() -> new RuntimeException("Khách hàng không tồn tại"));
        }

        // 2. Tạo Order Master
        Order order = new Order();
        order.setCustomerId(customer != null ? customer.getId() : null);
        order.setPaymentMethod(dto.getPaymentMethod());
        order.setShippingAddress(dto.getShippingAddress());
        order.setOrderStatus("PENDING"); // Mặc định mới tạo là Pending
        order.setCreatedAt(LocalDateTime.now());
        
        // 3. Xử lý Order Details (Items)
        List<OrderDetail> details = new ArrayList<>();
        BigDecimal calculatedTotal = BigDecimal.ZERO;

        if (dto.getItems() != null) {
            for (OrderDTO.OrderItemDTO itemDTO : dto.getItems()) {
                OrderDetail detail = new OrderDetail();
                detail.setOrder(order); // Link reference
                detail.setProductVariantId(itemDTO.getProductVariantId());
                detail.setQuantity(itemDTO.getQuantity());
                
                // LƯU Ý: Giá nên lấy từ Database sản phẩm để bảo mật, 
                // ở đây tạm lấy từ DTO theo yêu cầu layout hiện tại.
                detail.setPrice(itemDTO.getPrice());
                
                details.add(detail);
                
                // Cộng dồn tổng tiền
                BigDecimal lineTotal = itemDTO.getPrice().multiply(new BigDecimal(itemDTO.getQuantity()));
                calculatedTotal = calculatedTotal.add(lineTotal);
            }
        }
        
        order.setOrderDetails(details); // Cascade ALL sẽ tự lưu details
        // order.setTotalAmount(calculatedTotal); // Nếu Entity Order có trường total_amount

        Order saved = orderRepository.save(order);
        return toDTO(saved);
    }

    @Override
    @Transactional
    public OrderDTO updateOrder(Integer id, OrderDTO dto) {
        Order current = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        // Chỉ cho phép cập nhật một số trường nhất định
        if (dto.getOrderStatus() != null) {
            current.setOrderStatus(dto.getOrderStatus());
        }
        if (dto.getShippingAddress() != null) {
            current.setShippingAddress(dto.getShippingAddress());
        }
        
        // Không cho phép sửa Items trong logic đơn giản này (cần logic phức tạp hơn: trả hàng, hoàn tiền...)
        current.setUpdatedAt(LocalDateTime.now());

        Order saved = orderRepository.save(current);
        return toDTO(saved);
    }

    @Override
    @Transactional
    public void updateOrderStatus(Integer id, String status) {
        Order current = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));
        current.setOrderStatus(status);
        current.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(current);
    }

    @Override
    @Transactional
    public void deleteOrder(Integer id) {
        Order current = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));
        
        // Hủy đơn (Soft delete logic)
        current.setOrderStatus("CANCELLED"); 
        current.setDeletedAt(LocalDateTime.now());
        orderRepository.save(current);
    }

    // --- Mapper Helper ---
    private OrderDTO toDTO(Order entity) {
        OrderDTO dto = new OrderDTO();
        dto.setId(entity.getId());
        dto.setCustomerId(entity.getCustomerId() != null ? entity.getCustomerId().toString() : null);
        dto.setPaymentMethod(entity.getPaymentMethod());
        dto.setShippingAddress(entity.getShippingAddress());
        dto.setOrderStatus(entity.getOrderStatus());
        dto.setCreatedAt(entity.getCreatedAt());
        
        // Map Items
        if (entity.getOrderDetails() != null) {
            List<OrderDTO.OrderItemDTO> items = entity.getOrderDetails().stream().map(d -> {
                OrderDTO.OrderItemDTO itemDto = new OrderDTO.OrderItemDTO();
                itemDto.setProductVariantId(d.getProductVariantId());
                itemDto.setQuantity(d.getQuantity());
                itemDto.setPrice(d.getPrice());
                return itemDto;
            }).collect(Collectors.toList());
            dto.setItems(items);
            
            // Tính lại tổng tiền để hiển thị
            BigDecimal total = items.stream()
                .map(i -> i.getPrice().multiply(new BigDecimal(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            dto.setTotalAmount(total);
        }
        return dto;
    }
}