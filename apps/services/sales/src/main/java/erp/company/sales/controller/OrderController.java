package erp.company.sales.controller;

import erp.company.sales.dto.OrderDTO;
import erp.company.sales.service.OrderService;
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
@RequestMapping("/orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService orderService;

    // API: GET /orders
    @GetMapping
    public ResponseEntity<Page<OrderDTO>> getOrders(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false, name = "order_status") String status, // Map name để khớp JS params
            @RequestParam(required = false, name = "payment_method") String paymentMethod,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable
    ) {
        Page<OrderDTO> page = orderService.getOrders(keyword, customerId, status, paymentMethod, pageable);
        return ResponseEntity.ok(page);
    }

    // API: GET /orders/{id}
    @GetMapping("/{id}")
    public ResponseEntity<OrderDTO> getOrderById(@PathVariable Integer id) {
        OrderDTO order = orderService.getOrderById(id);
        return ResponseEntity.ok(order);
    }

    // API: POST /orders
    // Logic: Nhận OrderDTO chứa cả list Items.
    // Frontend nên gửi: { customer_id: "...", items: [ ... ] }
    @PostMapping
    public ResponseEntity<OrderDTO> createOrder(@Valid @RequestBody OrderDTO orderDTO) {
        OrderDTO created = orderService.createOrder(orderDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // API: PATCH /orders/{id} (Dùng cho Update status, Cancel)
    // Khớp với: orderService.update(id, data) hoặc cancel(id)
    @PatchMapping("/{id}")
    public ResponseEntity<OrderDTO> updateOrder(
            @PathVariable Integer id,
            @RequestBody OrderDTO orderDTO
    ) {
        // Nếu payload chỉ chứa orderStatus, Service sẽ chỉ update status
        OrderDTO updated = orderService.updateOrder(id, orderDTO);
        return ResponseEntity.ok(updated);
    }
    
    // Hỗ trợ endpoint PUT nếu Frontend gọi PUT cho Cancel
    @PutMapping("/{id}")
    public ResponseEntity<OrderDTO> updateOrderPut(
            @PathVariable Integer id,
            @RequestBody OrderDTO orderDTO
    ) {
        return updateOrder(id, orderDTO);
    }
}