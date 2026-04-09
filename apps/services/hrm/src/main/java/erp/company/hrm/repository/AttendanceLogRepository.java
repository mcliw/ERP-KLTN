package erp.company.hrm.repository;

import erp.company.hrm.entity.AttendanceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AttendanceLogRepository extends JpaRepository<AttendanceLog, Long> {

    // [Logic] Lấy log chấm công của nhân viên trong ngày để tính ra Giờ vào/Giờ ra
    // Dùng để xử lý dữ liệu thô -> Timesheet
    List<AttendanceLog> findByEmployee_EmployeeIdAndCheckTimeBetween(
            Integer employeeId, LocalDateTime startOfDay, LocalDateTime endOfDay);
}