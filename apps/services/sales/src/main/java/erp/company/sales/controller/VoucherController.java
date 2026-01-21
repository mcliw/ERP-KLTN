package erp.company.sales.controller;

import erp.company.sales.dto.VoucherDTO;
import erp.company.sales.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/vouchers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VoucherController {

    private final VoucherService voucherService;

    // API: GET /vouchers
    @GetMapping
    public ResponseEntity<Page<VoucherDTO>> getVouchers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String discountType,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable
    ) {
        Page<VoucherDTO> page = voucherService.getVouchers(keyword, discountType, status, pageable);
        return ResponseEntity.ok(page);
    }

    // API: GET /vouchers/{id}
    @GetMapping("/{id}")
    public ResponseEntity<VoucherDTO> getVoucherById(@PathVariable Integer id) {
        VoucherDTO voucher = voucherService.getVoucherById(id);
        return ResponseEntity.ok(voucher);
    }

    // API: POST /vouchers
    @PostMapping
    public ResponseEntity<VoucherDTO> createVoucher(@Valid @RequestBody VoucherDTO voucherDTO) {
        VoucherDTO created = voucherService.createVoucher(voucherDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // API: PUT /vouchers/{id}
    @PutMapping("/{id}")
    public ResponseEntity<VoucherDTO> updateVoucher(
            @PathVariable Integer id,
            @Valid @RequestBody VoucherDTO voucherDTO
    ) {
        VoucherDTO updated = voucherService.updateVoucher(id, voucherDTO);
        return ResponseEntity.ok(updated);
    }

    // API: DELETE /vouchers/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVoucher(@PathVariable Integer id) {
        voucherService.deleteVoucher(id);
        return ResponseEntity.noContent().build();
    }

    // API bổ sung: Check mã code (Dùng cho VoucherForm check duplicate hoặc Order áp dụng mã)
    @GetMapping("/check")
    public ResponseEntity<VoucherDTO> checkCode(@RequestParam String code) {
        VoucherDTO voucher = voucherService.findByCode(code);
        return ResponseEntity.ok(voucher);
    }
}