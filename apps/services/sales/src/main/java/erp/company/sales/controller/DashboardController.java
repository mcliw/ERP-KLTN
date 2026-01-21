package erp.company.sales.controller;

import erp.company.sales.service.CustomerService;
import erp.company.sales.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final OrderService orderService;
    private final CustomerService customerService;

    // API: GET /dashboard/summary
    // Frontend dashboard.service.js có thể đổi sang gọi API này thay vì fetch all
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getDashboardSummary() {
        Map<String, Object> response = new HashMap<>();
        
        // Ví dụ dữ liệu trả về (Logic chi tiết nên nằm trong ServiceImpl)
        // response.put("revenueStats", dashboardService.getRevenueStats());
        // response.put("customerStats", dashboardService.getCustomerStats());
        // response.put("pendingOrders", orderService.getPendingOrders());
        
        return ResponseEntity.ok(response);
    }
}