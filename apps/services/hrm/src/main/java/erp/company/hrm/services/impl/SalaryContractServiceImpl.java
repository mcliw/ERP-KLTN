package erp.company.hrm.services.impl;

import erp.company.hrm.dto.SalaryContractDTO;
import erp.company.hrm.entity.Employee;
import erp.company.hrm.entity.SalaryContract;
import erp.company.hrm.entity.enums.SalaryStatus;
import erp.company.hrm.repository.EmployeeRepository;
import erp.company.hrm.repository.SalaryContractRepository;
import erp.company.hrm.services.SalaryContractService;
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
public class SalaryContractServiceImpl implements SalaryContractService {

    private final SalaryContractRepository salaryRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public Page<SalaryContractDTO> getContracts(String keyword, Integer departmentId, String status, Pageable pageable) {
        // Sử dụng phương thức searchContracts custom trong repo hoặc dùng Spec ở đây
        // Ở đây dùng Spec để linh hoạt
        Specification<SalaryContract> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.isEmpty()) {
                String likeKey = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("employee").get("fullName")), likeKey),
                        cb.like(cb.lower(root.get("employee").get("employeeCode")), likeKey)
                ));
            }
            if (departmentId != null) {
                predicates.add(cb.equal(root.get("employee").get("department").get("departmentId"), departmentId));
            }
            if (status != null && !status.isEmpty()) {
                predicates.add(cb.equal(root.get("status"), mapStringToEnum(status)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return salaryRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public SalaryContractDTO getContractById(Integer id) {
        return mapToDTO(salaryRepository.findById(id).orElseThrow());
    }

    @Override
    public Page<SalaryContractDTO> getContractsByEmployee(Integer employeeId, Pageable pageable) {
        // Chuyển List từ repo thành PageImpl hoặc sửa repo trả về Page
        // Tạm thời return empty để demo
        return Page.empty();
    }

    @Override
    public SalaryContractDTO createContract(SalaryContractDTO dto) {
        Employee e = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Nhân viên không tồn tại"));

        SalaryContract sc = new SalaryContract();
        sc.setEmployee(e);
        sc.setBaseSalary(dto.getBaseSalary());
        sc.setAllowance(dto.getAllowance());
        sc.setInsuranceSalary(dto.getInsuranceSalary());
        sc.setEffectiveDate(dto.getEffectiveDate());
        sc.setStatus(SalaryStatus.DRAFT); // Mặc định là dự thảo

        return mapToDTO(salaryRepository.save(sc));
    }

    @Override
    public SalaryContractDTO updateContract(Integer id, SalaryContractDTO dto) {
        SalaryContract sc = salaryRepository.findById(id).orElseThrow();
        if (sc.getStatus() == SalaryStatus.EXPIRED) {
            throw new RuntimeException("Không thể sửa hợp đồng đã hết hạn");
        }
        
        sc.setBaseSalary(dto.getBaseSalary());
        sc.setAllowance(dto.getAllowance());
        sc.setInsuranceSalary(dto.getInsuranceSalary());
        sc.setEffectiveDate(dto.getEffectiveDate());
        if (dto.getStatus() != null) {
            sc.setStatus(mapStringToEnum(dto.getStatus()));
        }

        return mapToDTO(salaryRepository.save(sc));
    }

    @Override
    public void activateContract(Integer id) {
        SalaryContract current = salaryRepository.findById(id).orElseThrow();
        
        // Hết hạn hợp đồng cũ (nếu có)
        salaryRepository.findByEmployee_EmployeeIdAndStatus(current.getEmployee().getEmployeeId(), SalaryStatus.ACTIVE)
                .ifPresent(old -> {
                    old.setStatus(SalaryStatus.EXPIRED);
                    salaryRepository.save(old);
                });

        current.setStatus(SalaryStatus.ACTIVE);
        salaryRepository.save(current);
    }

    @Override
    public void deleteContract(Integer id) {
        SalaryContract sc = salaryRepository.findById(id).orElseThrow();
        if (sc.getStatus() == SalaryStatus.ACTIVE) {
             throw new RuntimeException("Không thể xóa hợp đồng đang hiệu lực");
        }
        salaryRepository.deleteById(id);
    }

    private SalaryContractDTO mapToDTO(SalaryContract sc) {
        return SalaryContractDTO.builder()
                .id(sc.getContractId())
                .employeeId(sc.getEmployee().getEmployeeId())
                .employeeCode(sc.getEmployee().getEmployeeCode())
                .employeeName(sc.getEmployee().getFullName())
                .baseSalary(sc.getBaseSalary())
                .allowance(sc.getAllowance())
                .insuranceSalary(sc.getInsuranceSalary())
                .effectiveDate(sc.getEffectiveDate())
                .status(mapEnumToString(sc.getStatus()))
                .build();
    }
    
    private SalaryStatus mapStringToEnum(String s) {
        if ("Hiệu lực".equals(s) || "Active".equals(s)) return SalaryStatus.ACTIVE;
        if ("Hết hạn".equals(s)) return SalaryStatus.EXPIRED;
        return SalaryStatus.DRAFT;
    }

    private String mapEnumToString(SalaryStatus s) {
        if (s == SalaryStatus.ACTIVE) return "Hiệu lực";
        if (s == SalaryStatus.EXPIRED) return "Hết hạn";
        return "Dự thảo";
    }
}