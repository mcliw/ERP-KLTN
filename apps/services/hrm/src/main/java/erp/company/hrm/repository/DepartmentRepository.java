package erp.company.hrm.repository;

import erp.company.hrm.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer>, JpaSpecificationExecutor<Department> {

    // [Form] Validation: Kiểm tra mã phòng ban đã tồn tại chưa (khi Create/Update)
    boolean existsByCode(String code);

    // [Form] Validation: Kiểm tra mã, ngoại trừ ID hiện tại (khi Update)
    boolean existsByCodeAndDepartmentIdNot(String code, Integer departmentId);

    // [Logic] Tìm theo mã
    Optional<Department> findByCode(String code);
}