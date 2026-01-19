package erp.company.hrm.repository;

import erp.company.hrm.entity.Payslip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, Long>, JpaSpecificationExecutor<Payslip> {

    // [Logic] Tìm phiếu lương theo tháng/năm của nhân viên (Tránh tính trùng)
    Optional<Payslip> findByEmployee_EmployeeIdAndMonthAndYear(Integer employeeId, Integer month, Integer year);
    
    // Check tồn tại
    boolean existsByEmployee_EmployeeIdAndMonthAndYear(Integer employeeId, Integer month, Integer year);
}