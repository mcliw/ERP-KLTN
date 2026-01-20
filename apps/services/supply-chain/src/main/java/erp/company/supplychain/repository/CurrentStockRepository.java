package erp.company.supplychain.repository;

import erp.company.supplychain.entity.CurrentStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CurrentStockRepository extends JpaRepository<CurrentStock, Integer>, JpaSpecificationExecutor<CurrentStock> {

    // Update Stock: Tìm bản ghi duy nhất để cập nhật số lượng
    Optional<CurrentStock> findByWarehouse_WarehouseIdAndProduct_ProductIdAndBinLocation_BinId(
            Integer warehouseId, Integer productId, Integer binId
    );

    // Update Stock: Trường hợp không quản lý Bin (Bin = null)
    Optional<CurrentStock> findByWarehouse_WarehouseIdAndProduct_ProductIdAndBinLocationIsNull(
            Integer warehouseId, Integer productId
    );
    
    // View: Xem tồn kho của một sản phẩm cụ thể
    List<CurrentStock> findByProduct_ProductId(Integer productId);
}