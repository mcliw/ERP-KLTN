package erp.company.hrm.services.impl;

import erp.company.hrm.dto.PositionDTO;
import erp.company.hrm.entity.Department;
import erp.company.hrm.entity.Position;
import erp.company.hrm.repository.DepartmentRepository;
import erp.company.hrm.repository.PositionRepository;
import erp.company.hrm.services.PositionService;
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
public class PositionServiceImpl implements PositionService {

    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;

    @Override
    public Page<PositionDTO> getPositions(String keyword, Integer departmentId, String status, Pageable pageable) {
        Specification<Position> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.isEmpty()) {
                String likeKey = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), likeKey),
                        cb.like(cb.lower(root.get("code")), likeKey)
                ));
            }
            if (departmentId != null) {
                predicates.add(cb.equal(root.get("department").get("departmentId"), departmentId));
            }
            if (status != null && !status.isEmpty()) {
                boolean isActive = "Hoạt động".equalsIgnoreCase(status);
                predicates.add(cb.equal(root.get("status"), isActive));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Position> page = positionRepository.findAll(spec, pageable);
        return page.map(this::mapToDTO);
    }

    @Override
    public List<PositionDTO> getPositionsByDepartment(Integer departmentId) {
        return positionRepository.findByDepartment_DepartmentId(departmentId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public PositionDTO getPositionById(Integer id) {
        Position pos = positionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chức vụ"));
        return mapToDTO(pos);
    }

    @Override
    public PositionDTO createPosition(PositionDTO dto) {
        if (positionRepository.existsByCode(dto.getCode())) {
            throw new RuntimeException("Mã chức vụ đã tồn tại");
        }
        Position entity = new Position();
        entity.setCode(dto.getCode());
        updateEntityFromDTO(entity, dto);
        return mapToDTO(positionRepository.save(entity));
    }

    @Override
    public PositionDTO updatePosition(Integer id, PositionDTO dto) {
        Position entity = positionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chức vụ"));

        // Logic check capacity < assigned count
        long assigned = positionRepository.countAssignees(id);
        if (dto.getCapacity() != null && dto.getCapacity() < assigned) {
             throw new RuntimeException("Số lượng không được nhỏ hơn nhân viên hiện có (" + assigned + ")");
        }

        updateEntityFromDTO(entity, dto);
        return mapToDTO(positionRepository.save(entity));
    }

    @Override
    public void deletePosition(Integer id) {
        long assigned = positionRepository.countAssignees(id);
        if (assigned > 0) {
            throw new RuntimeException("Không thể xóa chức vụ đang có người đảm nhận");
        }
        positionRepository.deleteById(id);
    }

    private PositionDTO mapToDTO(Position entity) {
        // Query count assignee để hiển thị
        long assigned = positionRepository.countAssignees(entity.getPositionId());
        
        return PositionDTO.builder()
                .id(entity.getPositionId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .capacity(entity.getCapacity())
                .status(Boolean.TRUE.equals(entity.getStatus()) ? "Hoạt động" : "Ngưng hoạt động")
                .departmentCode(entity.getDepartment() != null ? entity.getDepartment().getCode() : null)
                .departmentName(entity.getDepartment() != null ? entity.getDepartment().getName() : null)
                .assigneeCount((int) assigned)
                .build();
    }

    private void updateEntityFromDTO(Position entity, PositionDTO dto) {
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setCapacity(dto.getCapacity());
        if (dto.getStatus() != null) {
            entity.setStatus("Hoạt động".equalsIgnoreCase(dto.getStatus()));
        }
        
        if (dto.getDepartmentCode() != null || dto.getDepartmentName() != null) {
            // Logic tìm dept theo ID (DTO nên gửi deptId, nhưng nếu gửi Code thì tìm theo Code)
            // Giả sử DTO có field departmentCode map với Department ID ở Form
            // Ở đây đơn giản hoá là DTO gửi ID thông qua departmentCode (do select value)
            try {
                // Nếu Frontend gửi ID vào trường Code (do logic React select)
                Integer deptId = Integer.parseInt(dto.getDepartmentCode());
                Department dept = departmentRepository.findById(deptId).orElse(null);
                entity.setDepartment(dept);
            } catch (NumberFormatException e) {
                 // Nếu gửi code thật
                 Department dept = departmentRepository.findByCode(dto.getDepartmentCode()).orElse(null);
                 entity.setDepartment(dept);
            }
        }
    }
}