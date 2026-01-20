package erp.company.hrm.services;

import erp.company.hrm.dto.PositionDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface PositionService {
    // [Table & Filter] Tìm kiếm phân trang, lọc theo phòng ban
    Page<PositionDTO> getPositions(String keyword, Integer departmentId, String status, Pageable pageable);

    // [EmployeeForm] Cascading Dropdown: Lấy chức vụ theo phòng ban
    List<PositionDTO> getPositionsByDepartment(Integer departmentId);

    // [Form] Xem chi tiết
    PositionDTO getPositionById(Integer id);

    // [Form] Tạo mới
    PositionDTO createPosition(PositionDTO positionDTO);

    // [Form] Cập nhật
    PositionDTO updatePosition(Integer id, PositionDTO positionDTO);

    // [Table Action] Xóa
    void deletePosition(Integer id);
}