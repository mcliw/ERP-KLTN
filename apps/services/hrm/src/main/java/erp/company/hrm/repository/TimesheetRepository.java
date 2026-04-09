package erp.company.hrm.repository;

import erp.company.hrm.entity.Timesheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface TimesheetRepository extends JpaRepository<Timesheet, Long>, JpaSpecificationExecutor<Timesheet> {

    // [Form/Logic] Tìm timesheet của nhân viên vào ngày cụ thể (Check in/out logic)
    Optional<Timesheet> findByEmployee_EmployeeIdAndWorkDate(Integer employeeId, LocalDate workDate);

    // [Filter] Lấy danh sách công trong khoảng thời gian (VD: Trong tháng 10)
    // Hỗ trợ layout TimeKeepingTable khi filter theo tháng
    Iterable<Timesheet> findByWorkDateBetween(LocalDate startDate, LocalDate endDate);

    // Validation: Check xem đã có bản ghi chấm công ngày đó chưa
    boolean existsByEmployee_EmployeeIdAndWorkDate(Integer employeeId, LocalDate workDate);
}