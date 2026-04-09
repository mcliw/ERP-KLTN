package erp.company.hrm.repository;

import erp.company.hrm.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Integer>, JpaSpecificationExecutor<Employee> {

    // [Form] Validation: Các trường Unique
    boolean existsByEmployeeCode(String employeeCode);
    boolean existsByEmail(String email);
    boolean existsByIdentityCard(String identityCard);
    
    // Validation Update: Check trùng nhưng ngoại trừ ID hiện tại
    boolean existsByEmailAndEmployeeIdNot(String email, Integer employeeId);
    boolean existsByEmployeeCodeAndEmployeeIdNot(String code, Integer employeeId);

    // [Filter/Logic] Tìm theo mã nhân viên
    Optional<Employee> findByEmployeeCode(String employeeCode);

    // [Logic] Tìm theo Account ID (Link với Auth Service)
    Optional<Employee> findByAccountId(UUID accountId);

    // [Delete Logic] Đếm nhân viên trong phòng ban (để chặn xóa phòng ban nếu còn người)
    long countByDepartment_DepartmentId(Integer departmentId);
}