package erp.company.hrm.services.impl;

import erp.company.hrm.dto.LeaveRequestDTO;
import erp.company.hrm.entity.Employee;
import erp.company.hrm.entity.LeaveRequest;
import erp.company.hrm.entity.enums.LeaveStatus;
import erp.company.hrm.entity.enums.LeaveType;
import erp.company.hrm.repository.EmployeeRepository;
import erp.company.hrm.repository.LeaveRequestRepository;
import erp.company.hrm.services.LeaveRequestService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class LeaveRequestServiceImpl implements LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public Page<LeaveRequestDTO> getLeaveRequests(String keyword, Integer departmentId, String leaveType, String status, Pageable pageable) {
        Specification<LeaveRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (keyword != null && !keyword.isEmpty()) {
                 predicates.add(cb.like(cb.lower(root.get("employee").get("fullName")), "%" + keyword.toLowerCase() + "%"));
            }
            if (departmentId != null) {
                predicates.add(cb.equal(root.get("employee").get("department").get("departmentId"), departmentId));
            }
            if (status != null && !status.isEmpty()) {
                 // Map string to Enum
                 if("Chờ duyệt".equals(status)) predicates.add(cb.equal(root.get("status"), LeaveStatus.PENDING));
                 else if("Đã duyệt".equals(status)) predicates.add(cb.equal(root.get("status"), LeaveStatus.APPROVED));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return leaveRequestRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public LeaveRequestDTO getLeaveRequestById(Integer id) {
        return mapToDTO(leaveRequestRepository.findById(id).orElseThrow());
    }

    @Override
    public LeaveRequestDTO createLeaveRequest(LeaveRequestDTO dto) {
        // Lấy employee theo code (Do DTO gửi code) hoặc ID
        Employee e = employeeRepository.findByEmployeeCode(dto.getEmployeeCode())
                .orElseThrow(() -> new RuntimeException("Nhân viên không tồn tại"));

        // Check trùng lịch
        if (leaveRequestRepository.existsOverlapRequest(e.getEmployeeId(), dto.getFromDate(), dto.getToDate())) {
             throw new RuntimeException("Đã có đơn nghỉ trùng với thời gian này");
        }

        LeaveRequest lr = new LeaveRequest();
        lr.setEmployee(e);
        lr.setStartDate(dto.getFromDate());
        lr.setEndDate(dto.getToDate());
        lr.setReason(dto.getReason());
        lr.setLeaveType(mapStringToLeaveType(dto.getLeaveType()));
        lr.setStatus(LeaveStatus.PENDING);

        return mapToDTO(leaveRequestRepository.save(lr));
    }

    @Override
    public LeaveRequestDTO updateLeaveRequest(Integer id, LeaveRequestDTO dto) {
        LeaveRequest lr = leaveRequestRepository.findById(id).orElseThrow();
        if (lr.getStatus() != LeaveStatus.PENDING) {
             throw new RuntimeException("Chỉ được sửa đơn khi chưa được duyệt");
        }
        
        lr.setStartDate(dto.getFromDate());
        lr.setEndDate(dto.getToDate());
        lr.setReason(dto.getReason());
        lr.setLeaveType(mapStringToLeaveType(dto.getLeaveType()));
        
        return mapToDTO(leaveRequestRepository.save(lr));
    }

    @Override
    public void approveRequest(Integer id, Integer approverId) {
        LeaveRequest lr = leaveRequestRepository.findById(id).orElseThrow();
        lr.setStatus(LeaveStatus.APPROVED);
        // Set Approver logic...
        leaveRequestRepository.save(lr);
        // Trừ phép trong LeaveBalance (nếu cần)
    }

    @Override
    public void rejectRequest(Integer id, Integer approverId, String reason) {
        LeaveRequest lr = leaveRequestRepository.findById(id).orElseThrow();
        lr.setStatus(LeaveStatus.REJECTED);
        lr.setRejectionReason(reason);
        leaveRequestRepository.save(lr);
    }

    @Override
    public void cancelRequest(Integer id) {
        LeaveRequest lr = leaveRequestRepository.findById(id).orElseThrow();
        if (lr.getStatus() != LeaveStatus.PENDING) {
             throw new RuntimeException("Không thể hủy đơn đã duyệt/từ chối");
        }
        leaveRequestRepository.deleteById(id);
    }

    private LeaveRequestDTO mapToDTO(LeaveRequest lr) {
        return LeaveRequestDTO.builder()
                .id(lr.getRequestId())
                .employeeCode(lr.getEmployee().getEmployeeCode())
                .employeeName(lr.getEmployee().getFullName())
                .departmentName(lr.getEmployee().getDepartment() != null ? lr.getEmployee().getDepartment().getName() : "")
                .positionName(lr.getEmployee().getPosition() != null ? lr.getEmployee().getPosition().getName() : "")
                .leaveType(lr.getLeaveType().name())
                .fromDate(lr.getStartDate())
                .toDate(lr.getEndDate())
                .reason(lr.getReason())
                .status(mapStatusToString(lr.getStatus()))
                .build();
    }
    
    private LeaveType mapStringToLeaveType(String s) {
        if ("Nghỉ phép".equals(s)) return LeaveType.PAID;
        if ("Nghỉ không lương".equals(s)) return LeaveType.UNPAID;
        return LeaveType.PAID;
    }
    
    private String mapStatusToString(LeaveStatus s) {
        if (s == LeaveStatus.APPROVED) return "Đã duyệt";
        if (s == LeaveStatus.REJECTED) return "Từ chối";
        return "Chờ duyệt";
    }
}