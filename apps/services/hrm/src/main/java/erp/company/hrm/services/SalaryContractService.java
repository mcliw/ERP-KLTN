package erp.company.hrm.services;

import erp.company.hrm.dto.SalaryContractDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SalaryContractService {
    // [Table & Filter] Tìm hợp đồng (keyword tên NV, phòng ban, trạng thái hợp đồng)
    Page<SalaryContractDTO> getContracts(String keyword, Integer departmentId, String status, Pageable pageable);

    // [Form] Lấy chi tiết
    SalaryContractDTO getContractById(Integer id);

    // [History Table] Lấy lịch sử hợp đồng của 1 nhân viên cụ thể
    Page<SalaryContractDTO> getContractsByEmployee(Integer employeeId, Pageable pageable);

    // [Form] Tạo hợp đồng (Thường là trạng thái DRAFT)
    SalaryContractDTO createContract(SalaryContractDTO dto);

    // [Form] Cập nhật hợp đồng (Chỉ sửa được khi còn là DRAFT hoặc logic nghiệp vụ cho phép)
    SalaryContractDTO updateContract(Integer id, SalaryContractDTO dto);

    // [Quick Action] Kích hoạt hợp đồng (Chuyển DRAFT -> ACTIVE, cái cũ -> EXPIRED)
    void activateContract(Integer id);

    // [Table Action] Xóa hợp đồng (Chỉ xóa DRAFT)
    void deleteContract(Integer id);
}