package erp.company.supplychain.controller;

import erp.company.supplychain.dto.BinLocationDTO;
import erp.company.supplychain.services.BinLocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/bin_locations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BinLocationController {

    private final BinLocationService binService;

    @GetMapping
    public ResponseEntity<List<BinLocationDTO>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(name = "warehouse_id", required = false) Integer warehouseId,
            @RequestParam(name = "is_active", required = false) Boolean isActive,
            Pageable pageable) {
        
        Page<BinLocationDTO> page = binService.getBins(keyword, warehouseId, isActive, pageable);
        return ResponseEntity.ok(page.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BinLocationDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(binService.getBinById(id));
    }

    @PostMapping
    public ResponseEntity<BinLocationDTO> create(@RequestBody BinLocationDTO dto) {
        return new ResponseEntity<>(binService.createBin(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BinLocationDTO> update(@PathVariable Integer id, @RequestBody BinLocationDTO dto) {
        return ResponseEntity.ok(binService.updateBin(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        binService.deleteBin(id);
        return ResponseEntity.noContent().build();
    }
}