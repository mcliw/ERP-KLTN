package erp.company.hrm.services;

import erp.company.hrm.dto.LeaveRequestDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface LeaveRequestService {
    // [Table & Filter] Tìm đơn nghỉ (Keyword, phòng ban, loại nghỉ, trạng thái)
    Page<LeaveRequestDTO> getLeaveRequests(String keyword, Integer departmentId, 
                                           String leaveType, String status, Pageable pageable);

    // [Form] Lấy chi tiết đơn
    LeaveRequestDTO getLeaveRequestById(Integer id);

    // [Form] Tạo đơn xin nghỉ (Logic check trùng lịch, trừ quỹ phép)
    LeaveRequestDTO createLeaveRequest(LeaveRequestDTO dto);

    // [Form] Cập nhật đơn (Chỉ khi trạng thái là PENDING)
    LeaveRequestDTO updateLeaveRequest(Integer id, LeaveRequestDTO dto);

    // [Quick Action] Duyệt đơn (Manager action)
    void approveRequest(Integer id, Integer approverId);

    // [Quick Action] Từ chối đơn (Manager action)
    void rejectRequest(Integer id, Integer approverId, String reason);

    // [Table Action] Hủy đơn (Employee action - khi chưa duyệt)
    void cancelRequest(Integer id);
}