package erp.company.hrm.services;

import erp.company.hrm.dto.DepartmentDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DepartmentService {
    Page<DepartmentDto> getDepartments(String keyword, String status, Pageable pageable);
}