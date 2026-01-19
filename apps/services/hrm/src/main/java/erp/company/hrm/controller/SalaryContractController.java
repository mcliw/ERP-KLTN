package erp.company.hrm.controller;

import erp.company.hrm.dto.SalaryContractDTO;
import erp.company.hrm.services.SalaryContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/salaries")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SalaryContractController {

    private final SalaryContractService salaryService;

    @GetMapping
    public ResponseEntity<List<SalaryContractDTO>> getContracts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer departmentId, // Sửa tên param cho khớp filter
            @RequestParam(required = false) String status,
            @PageableDefault(size = 1000) Pageable pageable
    ) {
        return ResponseEntity.ok(salaryService.getContracts(keyword, departmentId, status, pageable).getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SalaryContractDTO> getContractById(@PathVariable Integer id) {
        return ResponseEntity.ok(salaryService.getContractById(id));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<SalaryContractDTO>> getHistory(@PathVariable Integer employeeId, Pageable pageable) {
        return ResponseEntity.ok(salaryService.getContractsByEmployee(employeeId, pageable).getContent());
    }

    @PostMapping
    public ResponseEntity<SalaryContractDTO> createContract(@RequestBody SalaryContractDTO dto) {
        return ResponseEntity.ok(salaryService.createContract(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SalaryContractDTO> updateContract(@PathVariable Integer id, @RequestBody SalaryContractDTO dto) {
        return ResponseEntity.ok(salaryService.updateContract(id, dto));
    }
    
    // Soft Delete (chuyển status) hoặc Hard Delete tùy logic service
    @DeleteMapping("/{id}") 
    public ResponseEntity<Void> deleteContract(@PathVariable Integer id) {
        salaryService.deleteContract(id);
        return ResponseEntity.noContent().build();
    }
}