package erp.company.supplychain.controller;

import erp.company.supplychain.entity.PrItem;
import erp.company.supplychain.repository.PrItemRepository; // Giả định đã có repo này
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pr_items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PrItemController {

    // Trong mô hình chuẩn, nên dùng Service. 
    // Ở đây demo nhanh để khớp endpoint FE đang gọi trực tiếp.
    private final PrItemRepository prItemRepository;

    @GetMapping
    public ResponseEntity<List<PrItem>> getByPrId(@RequestParam Integer pr_id) {
        return ResponseEntity.ok(prItemRepository.findByPurchaseRequest_PrId(pr_id));
    }

    @PostMapping
    public ResponseEntity<PrItem> create(@RequestBody PrItem item) {
        return new ResponseEntity<>(prItemRepository.save(item), HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        prItemRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}