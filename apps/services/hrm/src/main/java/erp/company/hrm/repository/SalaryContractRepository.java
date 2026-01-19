package erp.company.hrm.repository;

import erp.company.hrm.entity.SalaryContract;
import erp.company.hrm.entity.enums.SalaryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalaryContractRepository extends JpaRepository<SalaryContract, Integer>, JpaSpecificationExecutor<SalaryContract> {

    // [Logic] Tìm hợp đồng đang hiệu lực của nhân viên (Để tính lương)
    Optional<SalaryContract> findByEmployee_EmployeeIdAndStatus(Integer employeeId, SalaryStatus status);

    // [Table] Lấy lịch sử hợp đồng của 1 nhân viên
    List<SalaryContract> findByEmployee_EmployeeIdOrderByEffectiveDateDesc(Integer employeeId);

    // [Form] Validation: Check xem nhân viên đã có hợp đồng nào đang Active chưa
    boolean existsByEmployee_EmployeeIdAndStatus(Integer employeeId, SalaryStatus status);
    
    // [Filter Custom] Tìm kiếm hợp đồng dựa trên tên nhân viên hoặc mã nhân viên (JOIN Query)
    @Query("SELECT s FROM SalaryContract s JOIN s.employee e " +
           "WHERE (:keyword IS NULL OR lower(e.fullName) LIKE lower(concat('%', :keyword, '%')) " +
           "OR lower(e.employeeCode) LIKE lower(concat('%', :keyword, '%'))) " +
           "AND (:departmentId IS NULL OR e.department.departmentId = :departmentId) " +
           "AND (:status IS NULL OR s.status = :status)")
    List<SalaryContract> searchContracts(String keyword, Integer departmentId, SalaryStatus status);
}