package erp.company.supplychain.controller;

import erp.company.supplychain.dto.PurchaseOrderDTO;
import erp.company.supplychain.services.PurchaseOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/purchase_orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PurchaseOrderController {

    private final PurchaseOrderService poService;

    @GetMapping
    public ResponseEntity<List<PurchaseOrderDTO>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(name = "supplier_id", required = false) Integer supplierId,
            @RequestParam(required = false) String status,
            Pageable pageable) {
        
        Page<PurchaseOrderDTO> page = poService.getPurchaseOrders(keyword, supplierId, status, pageable);
        return ResponseEntity.ok(page.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(poService.getPoById(id));
    }

    @PostMapping
    public ResponseEntity<PurchaseOrderDTO> create(@RequestBody PurchaseOrderDTO dto) {
        return new ResponseEntity<>(poService.createPO(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PurchaseOrderDTO> update(@PathVariable Integer id, @RequestBody PurchaseOrderDTO dto) {
        return ResponseEntity.ok(poService.updatePO(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        poService.deletePO(id);
        return ResponseEntity.noContent().build();
    }
}