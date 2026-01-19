package erp.company.hrm.services.impl;

import erp.company.hrm.dto.DepartmentDto;
import erp.company.hrm.entity.Department;
import erp.company.hrm.repository.DepartmentRepository;
import erp.company.hrm.services.DepartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;

    @Override
    public Page<DepartmentDto> getDepartments(String keyword, String status, Pageable pageable) {
        Specification<Department> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // [LƯU Ý]: Entity Department/BaseEntity bạn gửi chưa có trường deletedAt. 
            // Nếu muốn dùng Soft Delete, hãy thêm private LocalDateTime deletedAt vào BaseEntity.
            // Tạm thời comment dòng này để code chạy được:
            // predicates.add(cb.isNull(root.get("deletedAt")));

            // 1. Tìm kiếm theo keyword (code hoặc name)
            if (StringUtils.hasText(keyword)) {
                String likePattern = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("code")), likePattern),
                        cb.like(cb.lower(root.get("name")), likePattern)
                ));
            }

            // 2. Lọc theo trạng thái
            // Vì Entity dùng Boolean (true/false) nhưng API nhận String ("Hoạt động"...)
            // Cần convert logic lọc:
            if (StringUtils.hasText(status)) {
                boolean statusBool = "Hoạt động".equalsIgnoreCase(status);
                predicates.add(cb.equal(root.get("status"), statusBool));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // Hàm này giờ đã hoạt động nhờ sửa Repository
        Page<Department> page = departmentRepository.findAll(spec, pageable);

        return page.map(this::mapToDto);
    }

    private DepartmentDto mapToDto(Department entity) {
        // Convert status từ Boolean sang String để khớp với Frontend
        String statusStr = (entity.getStatus() != null && entity.getStatus()) 
                           ? "Hoạt động" 
                           : "Ngưng hoạt động";

        return DepartmentDto.builder()
                // [SỬA LỖI]: Dùng getDepartmentId() thay vì getId()
                // Convert Integer sang String vì DTO yêu cầu String (như db.json)
                .id(String.valueOf(entity.getDepartmentId())) 
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(statusStr)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}