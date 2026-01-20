package erp.company.supplychain.repository;

import erp.company.supplychain.entity.BinLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BinLocationRepository extends JpaRepository<BinLocation, Integer>, JpaSpecificationExecutor<BinLocation> {

    // Filter/Dropdown: Lấy danh sách Bin thuộc 1 kho cụ thể
    List<BinLocation> findByWarehouse_WarehouseId(Integer warehouseId);

    // Form: Chỉ lấy Bin đang hoạt động thuộc 1 kho (InventoryForm)
    List<BinLocation> findByWarehouse_WarehouseIdAndIsActiveTrue(Integer warehouseId);

    // Validation: Check trùng mã Bin trong cùng 1 kho
    boolean existsByWarehouse_WarehouseIdAndBinCode(Integer warehouseId, String binCode);
    
    // Tìm chính xác để map dữ liệu nhập kho
    Optional<BinLocation> findByWarehouse_WarehouseIdAndBinCode(Integer warehouseId, String binCode);
}