package erp.company.hrm.controller;

import erp.company.hrm.dto.EmployeeDto;
import erp.company.hrm.entity.Employee;
import erp.company.hrm.entity.enums.EmployeeStatus;
import erp.company.hrm.services.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    public ResponseEntity<List<EmployeeDto>> getAllEmployees() {
        List<Employee> employees = employeeService.getAllEmployees();
        
        // Chuyển đổi Entity sang DTO để khớp với db.json
        List<EmployeeDto> employeeDtos = employees.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(employeeDtos);
    }

    private EmployeeDto convertToDto(Employee emp) {
        return EmployeeDto.builder()
                .id(emp.getEmployeeId())
                .code(emp.getEmployeeCode())
                .name(emp.getFullName())
                .gender(emp.getGender())
                .dob(emp.getBirthday())
                .email(emp.getEmail())
                .phone(emp.getPhone())
                // Kiểm tra null an toàn cho department và position
                .department(emp.getDepartment() != null ? emp.getDepartment().getCode() : "") 
                .position(emp.getPosition() != null ? emp.getPosition().getCode() : "")
                .status(mapStatus(emp.getStatusEmpl()))
                .avatarUrl(emp.getAvatarUrl())
                .joinDate(emp.getJoinDate())
                .hometown(emp.getHometown())
                .cccd(emp.getIdentityCard())
                .bankAccount(emp.getBankAccountNumber())
                .bankAccountName(emp.getFullName() != null ? emp.getFullName().toUpperCase() : "")
                .build();
    }
    
    @PostMapping
    public ResponseEntity<EmployeeDto> createEmployee(@RequestBody EmployeeDto employeeDto) {
        Employee newEmployee = employeeService.createEmployee(employeeDto);
        // Trả về DTO của nhân viên vừa tạo
        return ResponseEntity.ok(convertToDto(newEmployee));
    }

    private String mapStatus(EmployeeStatus status) {
        if (status == null) return "";
        // Giả sử Enum có giá trị ACTIVE, RESIGNED, v.v.
        switch (status.name()) {
            case "ACTIVE": return "Đang làm việc";
            case "RESIGNED": return "Đã nghỉ việc";
            case "ON_LEAVE": return "Nghỉ phép";
            default: return "Khác";
        }
    }
}