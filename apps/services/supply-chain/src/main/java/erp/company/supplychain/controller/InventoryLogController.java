package erp.company.supplychain.controller;

import erp.company.supplychain.entity.InventoryLog;
import erp.company.supplychain.repository.InventoryLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inventory_transaction_logs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InventoryLogController {

    private final InventoryLogRepository logRepository;

    // FE gọi để lấy lịch sử hoặc ghi log thủ công
    @GetMapping
    public ResponseEntity<List<InventoryLog>> getLogs(
            @RequestParam(required = false) Integer warehouse_id,
            @RequestParam(required = false) Integer product_id) {
        
        // Demo simple implementation using Repository directly for brevity
        // In real app, create a Service method
        if (product_id != null) {
            return ResponseEntity.ok(logRepository.findByProduct_ProductIdOrderByTransactionDateDesc(product_id));
        }
        return ResponseEntity.ok(logRepository.findAll(Sort.by(Sort.Direction.DESC, "transactionDate")));
    }

    @PostMapping
    public ResponseEntity<InventoryLog> createLog(@RequestBody InventoryLog log) {
        return ResponseEntity.ok(logRepository.save(log));
    }
}