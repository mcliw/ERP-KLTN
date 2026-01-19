package erp.company.hrm.services.impl;

import erp.company.hrm.dto.DepartmentDTO;
import erp.company.hrm.entity.Department;
import erp.company.hrm.entity.Employee;
import erp.company.hrm.repository.DepartmentRepository;
import erp.company.hrm.repository.EmployeeRepository;
import erp.company.hrm.services.DepartmentService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository; // Để map manager name

    @Override
    public Page<DepartmentDTO> getDepartments(String keyword, String status, Pageable pageable) {
        Specification<Department> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (keyword != null && !keyword.isEmpty()) {
                String likeKey = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), likeKey),
                        cb.like(cb.lower(root.get("code")), likeKey)
                ));
            }
            
            if (status != null && !status.isEmpty()) {
                boolean isActive = "Hoạt động".equalsIgnoreCase(status) || "Active".equalsIgnoreCase(status);
                predicates.add(cb.equal(root.get("status"), isActive));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Department> page = departmentRepository.findAll(spec, pageable);
        return page.map(this::mapToDTO);
    }

    @Override
    public List<DepartmentDTO> getAllActiveDepartments() {
        return departmentRepository.findAll().stream()
                .filter(Department::getStatus)
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public DepartmentDTO getDepartmentById(Integer id) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng ban: " + id));
        return mapToDTO(dept);
    }

    @Override
    public DepartmentDTO createDepartment(DepartmentDTO dto) {
        if (departmentRepository.existsByCode(dto.getCode())) {
            throw new RuntimeException("Mã phòng ban đã tồn tại: " + dto.getCode());
        }
        Department entity = new Department();
        entity.setCode(dto.getCode());
        updateEntityFromDTO(entity, dto);
        return mapToDTO(departmentRepository.save(entity));
    }

    @Override
    public DepartmentDTO updateDepartment(Integer id, DepartmentDTO dto) {
        Department entity = departmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng ban: " + id));

        // Logic FE: Không cho đổi code, nên bỏ qua setCode
        
        // Logic chặn deactivate nếu còn nhân viên
        if ("Ngưng hoạt động".equals(dto.getStatus()) && entity.getStatus()) {
            long empCount = employeeRepository.countByDepartment_DepartmentId(id);
            if (empCount > 0) {
                throw new RuntimeException("Không thể ngưng hoạt động vì còn nhân viên");
            }
        }
        
        updateEntityFromDTO(entity, dto);
        return mapToDTO(departmentRepository.save(entity));
    }

    @Override
    public void deleteDepartment(Integer id) {
        long empCount = employeeRepository.countByDepartment_DepartmentId(id);
        if (empCount > 0) {
            throw new RuntimeException("Không thể xóa phòng ban đang có nhân viên");
        }
        departmentRepository.deleteById(id);
    }

    // --- Helpers ---
    private DepartmentDTO mapToDTO(Department entity) {
        // Cần đếm nhân viên để trả về cho Table
        long count = employeeRepository.countByDepartment_DepartmentId(entity.getDepartmentId());
        
        return DepartmentDTO.builder()
                .id(entity.getDepartmentId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(Boolean.TRUE.equals(entity.getStatus()) ? "Hoạt động" : "Ngưng hoạt động")
                .managerId(entity.getManager() != null ? entity.getManager().getEmployeeId() : null)
                .managerName(entity.getManager() != null ? entity.getManager().getFullName() : null)
                .employeeCount((int) count)
                .build();
    }

    private void updateEntityFromDTO(Department entity, DepartmentDTO dto) {
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        
        if (dto.getStatus() != null) {
            entity.setStatus("Hoạt động".equalsIgnoreCase(dto.getStatus()));
        }
        
        // Logic update manager (nếu có logic chọn manager từ dropdown)
        if (dto.getManagerId() != null) {
            Employee manager = employeeRepository.findById(dto.getManagerId()).orElse(null);
            entity.setManager(manager);
        }
    }
}