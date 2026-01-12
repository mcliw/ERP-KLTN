package erp.company.hrm.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/hrm/employees") // Gateway đã cắt /api, nên ở đây bắt đầu bằng /hrm hoặc tùy chỉnh
public class EmployeeController {

    @GetMapping("/demo")
    public ResponseEntity<?> getDemoData(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        // Giả lập trả về dữ liệu nhân sự
        return ResponseEntity.ok(Map.of(
            "module", "HRM Service",
            "status", "Running behind Nginx & Gateway",
            "data", "Danh sách nhân viên demo: Nguyễn Văn A, Trần Thị B",
            "request_from_user_id", userId != null ? userId : "Anonymous"
        ));
    }
}