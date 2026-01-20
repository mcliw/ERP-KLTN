package erp.company.hrm.services;

import erp.company.hrm.dto.TimesheetDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDate;

public interface TimeKeepingService {
    // [Table & Filter] Xem bảng công (Lọc theo tên NV, ngày cụ thể, phòng ban)
    Page<TimesheetDTO> getTimesheets(String keyword, Integer departmentId, LocalDate date, String status, Pageable pageable);

    // [Table & Filter] Xem bảng công theo khoảng thời gian (Dùng cho export hoặc xem tháng)
    Page<TimesheetDTO> getTimesheetsByRange(LocalDate startDate, LocalDate endDate, Integer departmentId, Pageable pageable);

    // [Form] Tạo/Chấm công thủ công (Manual Check-in/Check-out)
    TimesheetDTO createOrUpdateTimesheet(TimesheetDTO dto);

    // [Form] Lấy chi tiết công ngày hôm đó của NV
    TimesheetDTO getTimesheetDetail(Integer employeeId, LocalDate date);

    // [Table Action] Hủy công (Xóa hoặc set về trạng thái 0 công)
    void deleteTimesheet(Long id);
    
    // [System] Chạy job tính toán lại công (nếu cần re-calc)
    void recalculateTimesheet(Long id);
}