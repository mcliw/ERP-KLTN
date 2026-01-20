package erp.company.supplychain.controller;

import erp.company.supplychain.dto.PurchaseRequestDTO;
import erp.company.supplychain.services.PurchaseRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/purchase_requests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PurchaseRequestController {

    private final PurchaseRequestService prService;

    @GetMapping
    public ResponseEntity<List<PurchaseRequestDTO>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) String status,
            Pageable pageable) {
        
        Page<PurchaseRequestDTO> page = prService.getRequests(keyword, departmentId, status, pageable);
        return ResponseEntity.ok(page.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseRequestDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(prService.getRequestById(id));
    }

    @PostMapping
    public ResponseEntity<PurchaseRequestDTO> create(@RequestBody PurchaseRequestDTO dto) {
        return new ResponseEntity<>(prService.createRequest(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PurchaseRequestDTO> update(@PathVariable Integer id, @RequestBody PurchaseRequestDTO dto) {
        // Handle logic duyệt/từ chối dựa trên status trong DTO hoặc endpoint riêng
        // FE service dùng PUT để approve/reject
        return ResponseEntity.ok(prService.updateRequest(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        prService.deleteRequest(id);
        return ResponseEntity.noContent().build();
    }
}