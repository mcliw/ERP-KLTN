package erp.company.hrm.services.impl;

import erp.company.hrm.dto.TimesheetDTO;
import erp.company.hrm.entity.Employee;
import erp.company.hrm.entity.Timesheet;
import erp.company.hrm.entity.enums.TimesheetStatus;
import erp.company.hrm.repository.EmployeeRepository;
import erp.company.hrm.repository.TimesheetRepository;
import erp.company.hrm.services.TimeKeepingService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TimeKeepingServiceImpl implements TimeKeepingService {

    private final TimesheetRepository timesheetRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public Page<TimesheetDTO> getTimesheets(String keyword, Integer departmentId, LocalDate date, String status, Pageable pageable) {
        Specification<Timesheet> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (keyword != null && !keyword.isEmpty()) {
                String likeKey = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("employee").get("fullName")), likeKey));
            }
            if (departmentId != null) {
                predicates.add(cb.equal(root.get("employee").get("department").get("departmentId"), departmentId));
            }
            if (date != null) {
                predicates.add(cb.equal(root.get("workDate"), date));
            }
            // Filter status string map to Enum logic here if needed
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return timesheetRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public Page<TimesheetDTO> getTimesheetsByRange(LocalDate startDate, LocalDate endDate, Integer departmentId, Pageable pageable) {
        // Implement filter by date range
        return Page.empty();
    }

    @Override
    public TimesheetDTO createOrUpdateTimesheet(TimesheetDTO dto) {
        // Check duplicate if create
        Timesheet entity;
        if (dto.getId() != null) {
            entity = timesheetRepository.findById(dto.getId()).orElseThrow();
        } else {
            if (timesheetRepository.existsByEmployee_EmployeeIdAndWorkDate(dto.getEmployeeId(), dto.getDate())) {
                 // Nếu đã có thì update record cũ thay vì báo lỗi (Logic update if exists)
                 entity = timesheetRepository.findByEmployee_EmployeeIdAndWorkDate(dto.getEmployeeId(), dto.getDate()).get();
            } else {
                entity = new Timesheet();
                Employee e = employeeRepository.findById(dto.getEmployeeId()).orElseThrow();
                entity.setEmployee(e);
                entity.setWorkDate(dto.getDate());
            }
        }
        
        entity.setCheckInTime(dto.getCheckInTime());
        entity.setCheckOutTime(dto.getCheckOutTime());
        entity.setNote(dto.getNote());
        
        // Logic tính status
        if ("Đi muộn".equals(dto.getStatus())) entity.setStatus(TimesheetStatus.LATE);
        else if ("Về sớm".equals(dto.getStatus())) entity.setStatus(TimesheetStatus.LEAVE_EARLY);
        else entity.setStatus(TimesheetStatus.ON_TIME);
        
        // Logic tính công
        entity.setPaidWorkDay(1.0);
        if (entity.getStatus() == TimesheetStatus.ABSENT) entity.setPaidWorkDay(0.0);

        return mapToDTO(timesheetRepository.save(entity));
    }

    @Override
    public TimesheetDTO getTimesheetDetail(Integer employeeId, LocalDate date) {
        return timesheetRepository.findByEmployee_EmployeeIdAndWorkDate(employeeId, date)
                .map(this::mapToDTO).orElse(null);
    }

    @Override
    public void deleteTimesheet(Long id) {
        timesheetRepository.deleteById(id);
    }

    @Override
    public void recalculateTimesheet(Long id) {
        // Logic tính toán lại giờ làm
    }

    private TimesheetDTO mapToDTO(Timesheet t) {
        return TimesheetDTO.builder()
                .id(t.getTimesheetId())
                .employeeId(t.getEmployee().getEmployeeId())
                .employeeCode(t.getEmployee().getEmployeeCode())
                .employeeName(t.getEmployee().getFullName())
                .departmentName(t.getEmployee().getDepartment() != null ? t.getEmployee().getDepartment().getName() : "")
                .date(t.getWorkDate())
                .checkInTime(t.getCheckInTime())
                .checkOutTime(t.getCheckOutTime())
                .status(t.getStatus().name()) // Cần map Enum sang tiếng Việt nếu FE yêu cầu
                .workCount(t.getPaidWorkDay())
                .note(t.getNote())
                .build();
    }
}