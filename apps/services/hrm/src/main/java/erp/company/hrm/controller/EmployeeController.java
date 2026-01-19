package erp.company.hrm.controller;

import erp.company.hrm.dto.EmployeeDTO;
import erp.company.hrm.services.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    public ResponseEntity<List<EmployeeDTO>> getEmployees(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer department, // FE gửi department ID hoặc Code
            @RequestParam(required = false) Integer position,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String code, // Support getByCode
            @PageableDefault(size = 1000) Pageable pageable
    ) {
        String searchKey = (code != null && !code.isEmpty()) ? code : keyword;
        return ResponseEntity.ok(employeeService.getEmployees(searchKey, department, position, gender, status, pageable).getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeDTO> getEmployeeById(@PathVariable Integer id) {
        return ResponseEntity.ok(employeeService.getEmployeeById(id));
    }

    @PostMapping
    public ResponseEntity<EmployeeDTO> createEmployee(@RequestBody EmployeeDTO dto) {
        // FE gửi JSON chứa cả Base64 string của file (avatarUrl, contractUrl...)
        // Service cần xử lý chuỗi Base64 này hoặc lưu link
        return ResponseEntity.ok(employeeService.createEmployee(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeDTO> updateEmployee(@PathVariable Integer id, @RequestBody EmployeeDTO dto) {
        return ResponseEntity.ok(employeeService.updateEmployee(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Integer id) {
        employeeService.deleteEmployee(id); // Xử lý Hard delete
        return ResponseEntity.noContent().build();
    }

    // --- Endpoints Upload File (Nếu FE muốn tách việc upload ra khỏi JSON payload) ---
    
    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadAvatar(@PathVariable Integer id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(employeeService.uploadAvatar(id, file));
    }

    @PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadDocument(
            @PathVariable Integer id, 
            @RequestParam("type") String docType, 
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(employeeService.uploadDocument(id, docType, file));
    }
}