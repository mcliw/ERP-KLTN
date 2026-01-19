package erp.company.hrm.controller;

import erp.company.hrm.dto.PositionDto;
import erp.company.hrm.services.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/positions")
@RequiredArgsConstructor
public class PositionController {

    private final PositionService positionService;

    @GetMapping
    public ResponseEntity<List<PositionDto>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department
    ) {
        return ResponseEntity.ok(positionService.getPositions(keyword, status, department));
    }

    @PostMapping
    public ResponseEntity<PositionDto> create(@RequestBody PositionDto dto) {
        return ResponseEntity.ok(positionService.createPosition(dto));
    }
}