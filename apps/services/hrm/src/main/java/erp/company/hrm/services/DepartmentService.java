package erp.company.hrm.services;

import erp.company.hrm.dto.DepartmentDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface DepartmentService {
    // [Table & Filter] Tìm kiếm phân trang
    Page<DepartmentDTO> getDepartments(String keyword, String status, Pageable pageable);

    // [EmployeeForm] Lấy danh sách để đổ vào Combobox (Dropdown)
    List<DepartmentDTO> getAllActiveDepartments();

    // [Form] Xem chi tiết
    DepartmentDTO getDepartmentById(Integer id);

    // [Form] Tạo mới
    DepartmentDTO createDepartment(DepartmentDTO departmentDTO);

    // [Form] Cập nhật
    DepartmentDTO updateDepartment(Integer id, DepartmentDTO departmentDTO);

    // [Table Action] Xóa (Cần check ràng buộc nhân viên)
    void deleteDepartment(Integer id);
}