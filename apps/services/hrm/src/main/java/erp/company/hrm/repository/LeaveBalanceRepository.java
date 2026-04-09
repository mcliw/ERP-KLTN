package erp.company.hrm.repository;

import erp.company.hrm.entity.LeaveBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance, Integer> {

    // [Logic] Lấy quỹ phép của nhân viên theo năm
    Optional<LeaveBalance> findByEmployee_EmployeeIdAndYear(Integer employeeId, Integer year);
}