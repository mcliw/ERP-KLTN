package erp.company.supplychain.controller;

import erp.company.supplychain.dto.WarehouseDTO;
import erp.company.supplychain.services.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/warehouses")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Cho phép Frontend gọi API
public class WarehouseController {

    private final WarehouseService warehouseService;

    // GET /warehouses?keyword=...&type=...&is_active=...
    @GetMapping
    public ResponseEntity<List<WarehouseDTO>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String type,
            @RequestParam(value = "is_active", required = false) Boolean isActive,
            @PageableDefault(size = 20) Pageable pageable) {
        
        // Lưu ý: Frontend đang dùng fetchAll và client-side pagination, 
        // nhưng API vẫn trả về Page hoặc List. Ở đây trả về List content để tương thích nhanh nhất
        // hoặc trả về Page object nếu FE handle meta pagination.
        // Để an toàn với json-server logic (thường trả về Array), ta trả về content của Page.
        Page<WarehouseDTO> page = warehouseService.getWarehouses(keyword, type, isActive, pageable);
        return ResponseEntity.ok(page.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WarehouseDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(warehouseService.getWarehouseById(id));
    }

    @PostMapping
    public ResponseEntity<WarehouseDTO> create(@Valid @RequestBody WarehouseDTO dto) {
        return new ResponseEntity<>(warehouseService.createWarehouse(dto), HttpStatus.CREATED);
    }

    // PUT handle cả Update info lẫn Soft Delete (FE gửi deletedAt)
    @PutMapping("/{id}")
    public ResponseEntity<WarehouseDTO> update(@PathVariable Integer id, @RequestBody WarehouseDTO dto) {
        return ResponseEntity.ok(warehouseService.updateWarehouse(id, dto));
    }

    // DELETE: Hard delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        warehouseService.deleteWarehouse(id);
        return ResponseEntity.noContent().build();
    }
}