package erp.company.hrm.controller;

import erp.company.hrm.dto.LeaveRequestDTO;
import erp.company.hrm.services.LeaveRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/onLeaves")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;

    @GetMapping
    public ResponseEntity<List<LeaveRequestDTO>> getLeaveRequests(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer department, // FE gửi department
            @RequestParam(required = false) String leaveType,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 1000) Pageable pageable
    ) {
        return ResponseEntity.ok(leaveRequestService.getLeaveRequests(keyword, department, leaveType, status, pageable).getContent());
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveRequestDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(leaveRequestService.getLeaveRequestById(id));
    }

    @PostMapping
    public ResponseEntity<LeaveRequestDTO> createRequest(@RequestBody LeaveRequestDTO dto) {
        return ResponseEntity.ok(leaveRequestService.createLeaveRequest(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LeaveRequestDTO> updateRequest(@PathVariable Integer id, @RequestBody LeaveRequestDTO dto) {
        // FE dùng chung PUT cho update info, approve, reject (thay đổi status)
        // Service cần logic để xử lý dựa trên status gửi lên
        
        // Nếu FE gửi status = APPROVED => Gọi approve
        if ("APPROVED".equalsIgnoreCase(dto.getStatus()) || "Đã duyệt".equals(dto.getStatus())) {
             // Cần ID người duyệt, tạm thời lấy từ context hoặc dto
             leaveRequestService.approveRequest(id, 1); // Mock ID 1 là admin
             return ResponseEntity.ok(leaveRequestService.getLeaveRequestById(id));
        }
        
        // Nếu FE gửi status = REJECTED
        if ("REJECTED".equalsIgnoreCase(dto.getStatus()) || "Từ chối".equals(dto.getStatus())) {
            leaveRequestService.rejectRequest(id, 1, dto.getReason());
            return ResponseEntity.ok(leaveRequestService.getLeaveRequestById(id));
        }

        return ResponseEntity.ok(leaveRequestService.updateLeaveRequest(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRequest(@PathVariable Integer id) {
        // Logic hủy đơn
        leaveRequestService.cancelRequest(id);
        return ResponseEntity.noContent().build();
    }
}