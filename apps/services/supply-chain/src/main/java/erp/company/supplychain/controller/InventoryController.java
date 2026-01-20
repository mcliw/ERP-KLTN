package erp.company.supplychain.controller;

import erp.company.supplychain.dto.InventoryDTO;
import erp.company.supplychain.services.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/current_stock")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<List<InventoryDTO>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(name = "warehouse_id", required = false) Integer warehouseId,
            @RequestParam(name = "product_id", required = false) Integer productId,
            @RequestParam(required = false) String stockStatus,
            Pageable pageable) {
        
        // Hỗ trợ filter cho cả chức năng tìm kiếm và validation (check trùng product trong kho)
        // Nếu FE gửi warehouse_id & product_id để check unique
        if (warehouseId != null && productId != null) {
             InventoryDTO detail = inventoryService.getStockByLocation(warehouseId, null, productId);
             if (detail != null) return ResponseEntity.ok(List.of(detail));
             return ResponseEntity.ok(List.of());
        }

        Page<InventoryDTO> page = inventoryService.getCurrentStock(keyword, warehouseId, stockStatus, pageable);
        return ResponseEntity.ok(page.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(inventoryService.getStockDetail(id));
    }

    // Tạo mới tồn kho (Initial Stock)
    @PostMapping
    public ResponseEntity<InventoryDTO> create(@RequestBody InventoryDTO dto) {
        // inventoryService.create/adjustStock xử lý logic và ghi log
        return new ResponseEntity<>(inventoryService.adjustStock(dto), HttpStatus.CREATED);
    }

    // Update (Adjustment hoặc Soft Delete)
    @PutMapping("/{id}")
    public ResponseEntity<InventoryDTO> update(@PathVariable Integer id, @RequestBody InventoryDTO dto) {
        // Logic điều chỉnh tồn kho
        dto.setStockId(id);
        return ResponseEntity.ok(inventoryService.adjustStock(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        // Logic hard delete (chỉ cho phép khi tồn = 0)
        // Impl chi tiết trong Service
        return ResponseEntity.noContent().build();
    }
}