package erp.company.hrm.repository;

import erp.company.hrm.entity.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PositionRepository extends JpaRepository<Position, Integer>, JpaSpecificationExecutor<Position> {

    // [Form] Validation: Check trùng mã
    boolean existsByCode(String code);
    boolean existsByCodeAndPositionIdNot(String code, Integer positionId);

    // [Form] Cascading Select: Lấy danh sách chức vụ thuộc một phòng ban
    List<Position> findByDepartment_DepartmentId(Integer departmentId);
    
    // [Logic] Lấy chức vụ Active
    List<Position> findByStatusTrue();
    
    // [Table] Đếm số lượng nhân viên đang giữ chức vụ này (Hỗ trợ logic xóa)
    @Query("SELECT COUNT(e) FROM Employee e WHERE e.position.positionId = :positionId AND e.statusEmpl <> 'RESIGNED'")
    long countAssignees(Integer positionId);
}