package erp.company.hrm.services.impl;

import erp.company.hrm.entity.Employee;
import erp.company.hrm.repository.EmployeeRepository;
import erp.company.hrm.services.EmployeeService;
import erp.company.hrm.dto.EmployeeDto;
import erp.company.hrm.entity.Department;
import erp.company.hrm.entity.Position;
import erp.company.hrm.entity.enums.EmployeeStatus;
import erp.company.hrm.repository.DepartmentRepository;
import erp.company.hrm.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;

    @Override
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    @Override
    @Transactional
    public Employee createEmployee(EmployeeDto dto) {
        Employee employee = new Employee();
        
        // Map các trường cơ bản
        employee.setEmployeeCode(dto.getCode());
        employee.setFullName(dto.getName());
        employee.setGender(dto.getGender());
        employee.setBirthday(dto.getDob());
        employee.setEmail(dto.getEmail());
        employee.setPhone(dto.getPhone());
        employee.setJoinDate(dto.getJoinDate());
        employee.setHometown(dto.getHometown());
        employee.setIdentityCard(dto.getCccd());
        employee.setBankAccountNumber(dto.getBankAccount());
        employee.setAvatarUrl(dto.getAvatarUrl());

        // Map Department (Tìm theo Code)
        if (dto.getDepartment() != null && !dto.getDepartment().isEmpty()) {
            Department dept = departmentRepository.findByCode(dto.getDepartment())
                    .orElse(null); // Hoặc ném lỗi nếu bắt buộc
            employee.setDepartment(dept);
        }

        // Map Position (Tìm theo Code)
        if (dto.getPosition() != null && !dto.getPosition().isEmpty()) {
            Position pos = positionRepository.findByCode(dto.getPosition())
                    .orElse(null);
            employee.setPosition(pos);
        }

        // Map Status (Chuyển chuỗi Tiếng Việt sang Enum)
        employee.setStatusEmpl(mapStatusToEnum(dto.getStatus()));

        return employeeRepository.save(employee);
    }

    private EmployeeStatus mapStatusToEnum(String statusStr) {
        if (statusStr == null) return EmployeeStatus.ACTIVE;
        // Logic mapping đơn giản, có thể mở rộng
        switch (statusStr) {
            case "Đang làm việc": return EmployeeStatus.ACTIVE;
            case "Nghỉ việc": return EmployeeStatus.RESIGNED;
            case "Nghỉ phép": return EmployeeStatus.ON_LEAVE;
            default: return EmployeeStatus.ACTIVE;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Employee> getUnlinkedEmployees() {
        // Giả sử trong DB bạn lưu status là 'YET' cho nhân viên chưa có tài khoản
        return employeeRepository.findByStatus("YET");
    }

    @Override
    @Transactional
    public void markEmployeeAsLinked(String employeeCode) {
        Employee emp = employeeRepository.findByEmployeeCode(employeeCode)
                .orElseThrow(() -> new RuntimeException("Employee not found with code: " + employeeCode));
        
        // Cập nhật trạng thái thành 'YES' (Đã có tài khoản)
        emp.setStatus("YES"); 
        employeeRepository.save(emp);
    }
}