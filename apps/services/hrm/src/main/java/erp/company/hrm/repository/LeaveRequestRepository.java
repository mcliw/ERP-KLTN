package erp.company.hrm.repository;

import erp.company.hrm.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Integer>, JpaSpecificationExecutor<LeaveRequest> {

    // [Filter] Lấy danh sách nghỉ phép của 1 nhân viên
    List<LeaveRequest> findByEmployee_EmployeeIdOrderByCreatedAtDesc(Integer employeeId);

    // [Form - Logic quan trọng] Check trùng lịch (Overlap Check)
    // Tìm các đơn đã duyệt hoặc chờ duyệt mà khoảng thời gian bị chồng lấn với đơn mới
    // Logic Overlap: (StartA <= EndB) AND (EndA >= StartB)
    @Query("SELECT count(l) > 0 FROM LeaveRequest l " +
           "WHERE l.employee.employeeId = :employeeId " +
           "AND l.status IN ('APPROVED', 'PENDING') " +
           "AND l.startDate <= :endDate AND l.endDate >= :startDate")
    boolean existsOverlapRequest(Integer employeeId, LocalDate startDate, LocalDate endDate);
    
    // Check overlap khi Update (trừ ID hiện tại ra)
    @Query("SELECT count(l) > 0 FROM LeaveRequest l " +
           "WHERE l.employee.employeeId = :employeeId " +
           "AND l.requestId <> :requestId " +
           "AND l.status IN ('APPROVED', 'PENDING') " +
           "AND l.startDate <= :endDate AND l.endDate >= :startDate")
    boolean existsOverlapRequestForUpdate(Integer employeeId, LocalDate startDate, LocalDate endDate, Integer requestId);
}