package erp.company.hrm.services.impl;

import erp.company.hrm.entity.Employee;
import erp.company.hrm.repository.EmployeeRepository;
import erp.company.hrm.services.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;

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