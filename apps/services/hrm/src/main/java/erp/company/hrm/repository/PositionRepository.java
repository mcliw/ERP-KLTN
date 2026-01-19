package erp.company.hrm.repository;

import erp.company.hrm.entity.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PositionRepository extends JpaRepository<Position, Integer> {
    Optional<Position> findByCode(String code);
}