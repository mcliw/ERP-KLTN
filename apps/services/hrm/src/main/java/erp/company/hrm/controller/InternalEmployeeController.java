// File: hrm/src/main/java/erp/company/hrm/controller/InternalEmployeeController.java
package erp.company.hrm.controller;

import erp.company.hrm.entity.Employee;
import erp.company.hrm.services.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/internal/api/employees") // Endpoint nội bộ
@RequiredArgsConstructor
public class InternalEmployeeController {

    private final EmployeeService employeeService;

    // API 1: Lấy danh sách nhân viên chưa có tài khoản để Identity hiển thị lên dropdown
    @GetMapping("/unlinked")
    public ResponseEntity<List<Employee>> getUnlinkedEmployees() {
        return ResponseEntity.ok(employeeService.getUnlinkedEmployees());
    }

    // API 2: Xác nhận đã tạo tài khoản thành công
    @PostMapping("/{employeeCode}/link-success")
    public ResponseEntity<Void> confirmAccountLinked(@PathVariable String employeeCode) {
        employeeService.markEmployeeAsLinked(employeeCode);
        return ResponseEntity.ok().build();
    }
}