package erp.company.supplychain.controller;

import erp.company.supplychain.entity.PoItem;
import erp.company.supplychain.repository.PoItemRepository; // Cần tạo repo này
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/po_items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PoItemController {

    private final PoItemRepository poItemRepository;

    @GetMapping
    public ResponseEntity<List<PoItem>> getByPoId(@RequestParam Integer po_id) {
        return ResponseEntity.ok(poItemRepository.findByPurchaseOrder_PoId(po_id));
    }

    @PostMapping
    public ResponseEntity<PoItem> create(@RequestBody PoItem item) {
        return new ResponseEntity<>(poItemRepository.save(item), HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        poItemRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    
    // JS service gọi PATCH để update item
    @PatchMapping("/{id}")
    public ResponseEntity<PoItem> updatePartial(@PathVariable Integer id, @RequestBody PoItem item) {
        // Simple impl
        PoItem existing = poItemRepository.findById(id).orElseThrow();
        // Map fields...
        if(item.getQuantityReceived() != null) existing.setQuantityReceived(item.getQuantityReceived());
        return ResponseEntity.ok(poItemRepository.save(existing));
    }
}