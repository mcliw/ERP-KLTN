package erp.company.hrm.services.impl;

import erp.company.hrm.dto.PositionDto;
import erp.company.hrm.entity.Department;
import erp.company.hrm.entity.Position;
import erp.company.hrm.repository.DepartmentRepository;
import erp.company.hrm.repository.PositionRepository;
import erp.company.hrm.services.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PositionServiceImpl implements PositionService {

    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;

    @Override
    public List<PositionDto> getPositions(String keyword, String status, String departmentCode) {
        // Logic filter đơn giản (hoặc dùng Specification nếu muốn filter DB)
        List<Position> all = positionRepository.findAll();
        
        return all.stream()
                .filter(p -> {
                    // Filter logic (đơn giản hóa bằng Java Stream)
                    boolean matchKeyword = !StringUtils.hasText(keyword) || 
                        p.getName().toLowerCase().contains(keyword.toLowerCase()) || 
                        p.getCode().toLowerCase().contains(keyword.toLowerCase());
                    
                    boolean matchStatus = !StringUtils.hasText(status) || 
                        (status.equals("Hoạt động") ? Boolean.TRUE.equals(p.getStatus()) : Boolean.FALSE.equals(p.getStatus()));
                    
                    boolean matchDept = !StringUtils.hasText(departmentCode) || 
                        (p.getDepartment() != null && p.getDepartment().getCode().equals(departmentCode));

                    return matchKeyword && matchStatus && matchDept;
                })
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public PositionDto createPosition(PositionDto dto) {
        // 1. Check trùng code
        if (positionRepository.findByCode(dto.getCode()).isPresent()) {
            throw new RuntimeException("Mã chức vụ '" + dto.getCode() + "' đã tồn tại.");
        }

        // 2. Tìm Department
        Department dept = departmentRepository.findByCode(dto.getDepartment())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã phòng ban: " + dto.getDepartment()));

        // 3. Map & Save
        Position entity = Position.builder()
                .code(dto.getCode())
                .name(dto.getName())
                .description(dto.getDescription())
                .status("Hoạt động".equalsIgnoreCase(dto.getStatus()) || dto.getStatus() == null)
                .capacity(dto.getCapacity() != null ? dto.getCapacity() : 1) // Mặc định 1 nếu null
                .department(dept)
                .build();

        return mapToDto(positionRepository.save(entity));
    }

    private PositionDto mapToDto(Position entity) {
        return PositionDto.builder()
                .id(String.valueOf(entity.getPositionId())) // Giả sử BaseEntity có getPositionId hoặc getId
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .status(Boolean.TRUE.equals(entity.getStatus()) ? "Hoạt động" : "Ngưng hoạt động")
                .capacity(entity.getCapacity())
                .department(entity.getDepartment() != null ? entity.getDepartment().getCode() : "")
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}