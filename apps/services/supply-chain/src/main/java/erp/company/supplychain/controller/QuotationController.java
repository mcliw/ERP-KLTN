package erp.company.supplychain.controller;

import erp.company.supplychain.dto.QuotationDTO;
import erp.company.supplychain.services.QuotationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/quotations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class QuotationController {

    private final QuotationService quotationService;

    @GetMapping
    public ResponseEntity<List<QuotationDTO>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(name = "supplier_id", required = false) Integer supplierId,
            @RequestParam(required = false) String status,
            @RequestParam(name = "pr_id", required = false) Integer prId,
            Pageable pageable) {
        
        // Nếu FE filter theo PR ID
        if (prId != null) {
            // Impl logic filter theo PR
             Page<QuotationDTO> page = quotationService.getQuotations(keyword, supplierId, status, pageable); 
             // Note: Cần bổ sung logic filter PrId trong Service/Repo Specification
             return ResponseEntity.ok(page.getContent());
        }

        Page<QuotationDTO> page = quotationService.getQuotations(keyword, supplierId, status, pageable);
        return ResponseEntity.ok(page.getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuotationDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(quotationService.getQuotationById(id));
    }

    @PostMapping
    public ResponseEntity<QuotationDTO> create(@RequestBody QuotationDTO dto) {
        return new ResponseEntity<>(quotationService.createQuotation(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuotationDTO> update(@PathVariable Integer id, @RequestBody QuotationDTO dto) {
        // Kiểm tra logic Approve/Select/Reject từ DTO status
        if (Boolean.TRUE.equals(dto.getIsSelected())) {
            quotationService.selectQuotation(id);
            return ResponseEntity.ok(quotationService.getQuotationById(id));
        }
        return ResponseEntity.ok(quotationService.updateQuotation(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        quotationService.deleteQuotation(id);
        return ResponseEntity.noContent().build();
    }
}