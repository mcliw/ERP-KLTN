package erp.company.hrm.controller;

import erp.company.hrm.dto.PositionDTO;
import erp.company.hrm.services.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/positions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PositionController {

    private final PositionService positionService;

    @GetMapping
    public ResponseEntity<List<PositionDTO>> getPositions(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String code, // Hỗ trợ getByCode của FE
            @PageableDefault(size = 1000) Pageable pageable
    ) {
        // Nếu FE gửi ?code=... thì coi như tìm kiếm theo keyword hoặc xử lý riêng trong service
        String searchKey = (code != null && !code.isEmpty()) ? code : keyword;
        return ResponseEntity.ok(positionService.getPositions(searchKey, departmentId, status, pageable).getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PositionDTO> getPositionById(@PathVariable Integer id) {
        return ResponseEntity.ok(positionService.getPositionById(id));
    }
    
    // Endpoint hỗ trợ lấy chức vụ theo phòng ban (Cascading Dropdown)
    @GetMapping("/by-department/{deptId}")
    public ResponseEntity<List<PositionDTO>> getByDepartment(@PathVariable Integer deptId) {
        return ResponseEntity.ok(positionService.getPositionsByDepartment(deptId));
    }

    @PostMapping
    public ResponseEntity<PositionDTO> createPosition(@RequestBody PositionDTO dto) {
        return ResponseEntity.ok(positionService.createPosition(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PositionDTO> updatePosition(@PathVariable Integer id, @RequestBody PositionDTO dto) {
        return ResponseEntity.ok(positionService.updatePosition(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePosition(@PathVariable Integer id) {
        positionService.deletePosition(id);
        return ResponseEntity.noContent().build();
    }
}