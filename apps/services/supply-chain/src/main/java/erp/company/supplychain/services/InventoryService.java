package erp.company.supplychain.services;

import erp.company.supplychain.dto.InventoryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InventoryService {
    // Table + Filter: Xem tồn kho (kèm logic StockStatus: Low, Available, OutOfStock)
    Page<InventoryDTO> getCurrentStock(String keyword, Integer warehouseId, String stockStatus, Pageable pageable);

    // Form (View Detail): Xem chi tiết 1 dòng tồn kho
    InventoryDTO getStockDetail(Integer stockId);

    // Form Action: Điều chỉnh tồn kho (Nhập kho ban đầu hoặc Kiểm kê điều chỉnh)
    // Hàm này sẽ cập nhật CurrentStock và ghi vào InventoryLog
    InventoryDTO adjustStock(InventoryDTO adjustmentDTO);

    // Logic: Lấy tồn kho cụ thể của 1 sản phẩm tại 1 vị trí (dùng khi validate xuất kho)
    InventoryDTO getStockByLocation(Integer warehouseId, Integer binId, Integer productId);
}