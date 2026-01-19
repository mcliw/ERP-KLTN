package erp.company.hrm.services;

import erp.company.hrm.dto.PositionDto;
import java.util.List;

public interface PositionService {
    List<PositionDto> getPositions(String keyword, String status, String department);

    PositionDto createPosition(PositionDto dto);
}
