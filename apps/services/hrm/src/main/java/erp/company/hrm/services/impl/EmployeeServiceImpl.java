package erp.company.hrm.services.impl;

import erp.company.hrm.dto.EmployeeDTO;
import erp.company.hrm.entity.Department;
import erp.company.hrm.entity.Employee;
import erp.company.hrm.entity.Position;
import erp.company.hrm.entity.enums.EmployeeStatus;
import erp.company.hrm.repository.DepartmentRepository;
import erp.company.hrm.repository.EmployeeRepository;
import erp.company.hrm.repository.PositionRepository;
import erp.company.hrm.services.EmployeeService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;

    @Override
    public Page<EmployeeDTO> getEmployees(String keyword, Integer departmentId, Integer positionId, String gender, String status, Pageable pageable) {
        Specification<Employee> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.isEmpty()) {
                String likeKey = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), likeKey),
                        cb.like(cb.lower(root.get("email")), likeKey),
                        cb.like(cb.lower(root.get("employeeCode")), likeKey)
                ));
            }
            if (departmentId != null) {
                predicates.add(cb.equal(root.get("department").get("departmentId"), departmentId));
            }
            if (positionId != null) {
                predicates.add(cb.equal(root.get("position").get("positionId"), positionId));
            }
            if (gender != null && !gender.isEmpty()) {
                predicates.add(cb.equal(root.get("gender"), gender));
            }
            if (status != null && !status.isEmpty()) {
                // Map String status from FE to Enum
                EmployeeStatus empStatus = mapStatusToEnum(status);
                if (empStatus != null) {
                    predicates.add(cb.equal(root.get("statusEmpl"), empStatus));
                }
            } else {
                // Mặc định không lấy RESIGNED nếu không filter (tùy nghiệp vụ)
                // predicates.add(cb.notEqual(root.get("statusEmpl"), EmployeeStatus.RESIGNED));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return employeeRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public EmployeeDTO getEmployeeById(Integer id) {
        Employee e = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nhân viên không tồn tại"));
        return mapToDTO(e);
    }

    @Override
    public EmployeeDTO createEmployee(EmployeeDTO dto) {
        if (employeeRepository.existsByEmployeeCode(dto.getCode())) {
            throw new RuntimeException("Mã nhân viên đã tồn tại");
        }
        
        Employee entity = new Employee();
        entity.setEmployeeCode(dto.getCode());
        updateEntityFromDTO(entity, dto);
        
        // Status mặc định
        entity.setStatusEmpl(EmployeeStatus.PROBATION); 
        if("Đang làm việc".equals(dto.getStatus())) entity.setStatusEmpl(EmployeeStatus.OFFICIAL);

        return mapToDTO(employeeRepository.save(entity));
    }

    @Override
    public EmployeeDTO updateEmployee(Integer id, EmployeeDTO dto) {
        Employee entity = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nhân viên không tồn tại"));

        updateEntityFromDTO(entity, dto);
        return mapToDTO(employeeRepository.save(entity));
    }

    @Override
    public String uploadAvatar(Integer id, MultipartFile file) {
        // Logic giả lập upload: Lưu file -> return URL
        // Trong thực tế sẽ upload lên AWS S3 hoặc thư mục static
        String fakeUrl = "http://localhost:8080/uploads/avatars/" + file.getOriginalFilename();
        
        Employee e = employeeRepository.findById(id).orElseThrow();
        e.setAvatarUrl(fakeUrl);
        employeeRepository.save(e);
        return fakeUrl;
    }

    @Override
    public String uploadDocument(Integer id, String docType, MultipartFile file) {
        // Logic giả lập upload tài liệu
        return "http://localhost:8080/uploads/docs/" + docType + "/" + file.getOriginalFilename();
    }

    @Override
    public void deleteEmployee(Integer id) {
        Employee e = employeeRepository.findById(id).orElseThrow();
        e.setStatusEmpl(EmployeeStatus.TERMINATED); // Soft delete
        employeeRepository.save(e);
    }

    // --- Helpers ---
    private EmployeeDTO mapToDTO(Employee e) {
        return EmployeeDTO.builder()
                .id(e.getEmployeeId())
                .code(e.getEmployeeCode())
                .name(e.getFullName())
                .email(e.getEmail())
                .phone(e.getPhone())
                .gender(e.getGender())
                .dob(e.getBirthday())
                .hometown(e.getHometown())
                .cccd(e.getIdentityCard())
                .address(e.getAddress())
                // Map liên kết
                .departmentCode(e.getDepartment() != null ? e.getDepartment().getCode() : null)
                .departmentName(e.getDepartment() != null ? e.getDepartment().getName() : "")
                .positionCode(e.getPosition() != null ? e.getPosition().getCode() : null)
                .positionName(e.getPosition() != null ? e.getPosition().getName() : "")
                .joinDate(e.getJoinDate())
                .status(mapEnumToStatus(e.getStatusEmpl()))
                .bankAccountName(e.getBankAccountName())
                .bankAccount(e.getBankAccountNumber())
                .bankName(e.getBankName())
                .avatarUrl(e.getAvatarUrl())
                .build();
    }

    private void updateEntityFromDTO(Employee e, EmployeeDTO dto) {
        e.setFullName(dto.getName());
        e.setEmail(dto.getEmail());
        e.setPhone(dto.getPhone());
        e.setGender(dto.getGender());
        e.setBirthday(dto.getDob());
        e.setHometown(dto.getHometown());
        e.setIdentityCard(dto.getCccd());
        e.setAddress(dto.getAddress());
        e.setJoinDate(dto.getJoinDate() != null ? dto.getJoinDate() : LocalDate.now());
        
        // Map Banking
        e.setBankName(dto.getBankName());
        e.setBankAccountNumber(dto.getBankAccount());
        e.setBankAccountName(dto.getBankAccountName());

        // Map Dept/Pos by Code (Assuming DTO sends Code or ID in Code field)
        if (dto.getDepartmentCode() != null) {
            Department d = departmentRepository.findByCode(dto.getDepartmentCode()).orElse(null);
            e.setDepartment(d);
        }
        if (dto.getPositionCode() != null) {
            Position p = positionRepository.findByDepartment_DepartmentId(e.getDepartment().getDepartmentId())
                    .stream().filter(pos -> pos.getCode().equals(dto.getPositionCode())).findFirst().orElse(null);
            e.setPosition(p);
        }
        
        if (dto.getStatus() != null) {
            e.setStatusEmpl(mapStatusToEnum(dto.getStatus()));
        }
        
        // Map File URLs nếu DTO gửi chuỗi Base64 hoặc URL đã upload
        if (dto.getAvatarUrl() != null && !dto.getAvatarUrl().isEmpty()) {
            e.setAvatarUrl(dto.getAvatarUrl());
        }
    }

    private EmployeeStatus mapStatusToEnum(String status) {
        if (status == null) return EmployeeStatus.PROBATION;
        switch (status) {
            case "Đang làm việc":
            case "Active": return EmployeeStatus.OFFICIAL;
            case "Nghỉ việc": return EmployeeStatus.RESIGNED;
            case "Thử việc": return EmployeeStatus.PROBATION;
            default: return EmployeeStatus.OFFICIAL;
        }
    }

    private String mapEnumToStatus(EmployeeStatus status) {
        if (status == null) return "Thử việc";
        switch (status) {
            case OFFICIAL: return "Đang làm việc";
            case RESIGNED: return "Nghỉ việc";
            case PROBATION: return "Thử việc";
            case TERMINATED: return "Đã thôi việc";
            default: return "Đang làm việc";
        }
    }
}