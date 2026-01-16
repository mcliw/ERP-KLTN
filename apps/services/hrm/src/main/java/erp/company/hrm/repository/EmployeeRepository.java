package erp.company.hrm.repository;

import erp.company.hrm.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    // Tìm nhân viên theo trạng thái (YET/YES)
    List<Employee> findByStatus(String status);
    
    // Tìm theo mã nhân viên
    Optional<Employee> findByEmployeeCode(String employeeCode);
}