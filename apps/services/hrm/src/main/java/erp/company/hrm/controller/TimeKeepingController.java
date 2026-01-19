package erp.company.hrm.controller;

import erp.company.hrm.dto.TimesheetDTO;
import erp.company.hrm.services.TimeKeepingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/timeKeeping") 
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TimeKeepingController {

    private final TimeKeepingService timeKeepingService;

    @GetMapping
    public ResponseEntity<List<TimesheetDTO>> getTimesheets(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 1000) Pageable pageable
    ) {
        // FE timeKeeping.service.js gửi query param ?date=...
        return ResponseEntity.ok(timeKeepingService.getTimesheets(keyword, departmentId, date, status, pageable).getContent());
    }
    
    // API hỗ trợ lấy chi tiết để check duplicate
    @GetMapping("/detail")
    public ResponseEntity<TimesheetDTO> getDetail(
            @RequestParam Integer employeeId, 
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(timeKeepingService.getTimesheetDetail(employeeId, date));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TimesheetDTO> getById(@PathVariable Long id) {
        // Vì Timesheet ID là Long
        // Ở service Java tôi dùng Long, FE có thể gửi string number.
        return null; // Cần implement hàm getById trong Service nếu cần
    }

    @PostMapping
    public ResponseEntity<TimesheetDTO> checkIn(@RequestBody TimesheetDTO dto) {
        return ResponseEntity.ok(timeKeepingService.createOrUpdateTimesheet(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TimesheetDTO> updateTimesheet(@PathVariable Long id, @RequestBody TimesheetDTO dto) {
        // FE gửi PUT để update giờ ra/vào
        dto.setId(id);
        return ResponseEntity.ok(timeKeepingService.createOrUpdateTimesheet(dto));
    }
    
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelTimesheet(@PathVariable Long id) {
        timeKeepingService.deleteTimesheet(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTimesheet(@PathVariable Long id) {
        timeKeepingService.deleteTimesheet(id);
        return ResponseEntity.noContent().build();
    }
}