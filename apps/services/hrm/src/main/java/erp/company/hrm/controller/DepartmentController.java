package erp.company.hrm.controller;

import erp.company.hrm.dto.DepartmentDTO;
import erp.company.hrm.services.DepartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/departments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Cho phép Frontend gọi API
public class DepartmentController {

    private final DepartmentService departmentService;

    // FE: department.service.js -> getAll()
    @GetMapping
    public ResponseEntity<List<DepartmentDTO>> getAllDepartments(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 1000) Pageable pageable // Size lớn để giả lập "Get All" của FE
    ) {
        // Service trả về Page, nhưng FE cần Array -> lấy content
        return ResponseEntity.ok(departmentService.getDepartments(keyword, status, pageable).getContent());
    }

    // FE: department.service.js -> getByCode() (Dùng query param ?code=...)
    // Tuy nhiên logic REST chuẩn thường là GET /{id}. 
    // Dựa trên code JS: fetch(`${API_URL}?code=...`) -> Controller phải hứng param code ở hàm getAll hoặc viết riêng.
    // Vì JS dùng chung URL getAll và filter code, nên hàm getAll ở trên đã bao gồm logic này nếu implement filter đúng.
    // Nếu muốn tách riêng GetByID:
    @GetMapping("/{id}")
    public ResponseEntity<DepartmentDTO> getDepartmentById(@PathVariable Integer id) {
        return ResponseEntity.ok(departmentService.getDepartmentById(id));
    }

    @PostMapping
    public ResponseEntity<DepartmentDTO> createDepartment(@RequestBody DepartmentDTO dto) {
        return ResponseEntity.ok(departmentService.createDepartment(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DepartmentDTO> updateDepartment(@PathVariable Integer id, @RequestBody DepartmentDTO dto) {
        // FE dùng PUT cho cả update info lẫn soft delete (đổi status)
        return ResponseEntity.ok(departmentService.updateDepartment(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Integer id) {
        departmentService.deleteDepartment(id);
        return ResponseEntity.noContent().build();
    }
}