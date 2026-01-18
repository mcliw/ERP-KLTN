package erp.company.hrm.services;

import erp.company.hrm.dto.EmployeeDto;
import erp.company.hrm.entity.Employee;
import java.util.List;

public interface EmployeeService {
    List<Employee> getUnlinkedEmployees();
    List<Employee> getAllEmployees();
    Employee createEmployee(EmployeeDto employeeDto);
    void markEmployeeAsLinked(String employeeCode);
}