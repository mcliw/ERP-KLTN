package erp.company.supplychain.repository;

import erp.company.supplychain.entity.Warehouse;
import erp.company.supplychain.entity.enums.WarehouseType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Integer>, JpaSpecificationExecutor<Warehouse> {

    // Validation: Check mã kho tồn tại (WarehouseForm)
    boolean existsByWarehouseCode(String warehouseCode);

    // Dropdown: Lấy danh sách kho đang hoạt động (cho BinForm, InventoryForm, GrForm...)
    List<Warehouse> findByIsActiveTrue();
    
    // Dropdown: Lấy theo loại kho (nếu cần filter nhanh)
    List<Warehouse> findByWarehouseType(WarehouseType type);
}