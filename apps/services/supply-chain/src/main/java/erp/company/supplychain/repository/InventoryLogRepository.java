package erp.company.supplychain.repository;

import erp.company.supplychain.entity.InventoryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryLogRepository extends JpaRepository<InventoryLog, Long>, JpaSpecificationExecutor<InventoryLog> {

    // Xem lịch sử giao dịch của 1 sản phẩm
    List<InventoryLog> findByProduct_ProductIdOrderByTransactionDateDesc(Integer productId);

    // Xem lịch sử giao dịch tại 1 kho
    List<InventoryLog> findByWarehouse_WarehouseIdOrderByTransactionDateDesc(Integer warehouseId);
}