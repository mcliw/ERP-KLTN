package erp.company.supplychain.controller;

import erp.company.supplychain.dto.SupplierDTO;
import erp.company.supplychain.services.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/suppliers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    public ResponseEntity<List<SupplierDTO>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Double rating,
            @RequestParam(required = false) String code, // Hỗ trợ tìm chính xác theo code
            @RequestParam(required = false) String taxCode, // Hỗ trợ validation trùng MST
            Pageable pageable) {
        
        // Logic search chính xác cho validation FE
        if (code != null || taxCode != null) {
            // Impl logic tìm chính xác hoặc reuse getSuppliers với keyword
            Page<SupplierDTO> page = supplierService.getSuppliers(code != null ? code : taxCode, null, null, pageable);
            return ResponseEntity.ok(page.getContent());
        }

        Page<SupplierDTO> page = supplierService.getSuppliers(keyword, status, rating, pageable);
        return ResponseEntity.ok(page.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SupplierDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(supplierService.getSupplierById(id));
    }

    @PostMapping
    public ResponseEntity<SupplierDTO> create(@RequestBody SupplierDTO dto) {
        return new ResponseEntity<>(supplierService.createSupplier(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SupplierDTO> update(@PathVariable Integer id, @RequestBody SupplierDTO dto) {
        return ResponseEntity.ok(supplierService.updateSupplier(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.noContent().build();
    }
}