package erp.company.hrm.services;

import erp.company.hrm.dto.EmployeeDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface EmployeeService {
    // [Table & Filter] Bộ lọc nâng cao: Keyword, Dept, Pos, Gender, Status
    Page<EmployeeDTO> getEmployees(String keyword, Integer departmentId, Integer positionId, 
                                   String gender, String status, Pageable pageable);

    // [Form] Lấy chi tiết
    EmployeeDTO getEmployeeById(Integer id);

    // [Form] Tạo mới (Kèm xử lý upload file nếu cần tách riêng hoặc gộp trong DTO)
    EmployeeDTO createEmployee(EmployeeDTO employeeDTO);

    // [Form] Cập nhật
    EmployeeDTO updateEmployee(Integer id, EmployeeDTO employeeDTO);

    // [Form Action] Upload Avatar riêng (Optional)
    String uploadAvatar(Integer id, MultipartFile file);

    // [Form Action] Upload hồ sơ (Hợp đồng, CV...)
    String uploadDocument(Integer id, String docType, MultipartFile file);

    // [Table Action] Xóa mềm (Soft delete)
    void deleteEmployee(Integer id);
}