package erp.company.supplychain.services;

import erp.company.supplychain.dto.WarehouseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface WarehouseService {
    // Table + Filter: Lấy danh sách có phân trang và lọc theo từ khóa, loại kho, trạng thái
    Page<WarehouseDTO> getWarehouses(String keyword, String type, Boolean isActive, Pageable pageable);

    // Form (Edit): Lấy chi tiết
    WarehouseDTO getWarehouseById(Integer id);

    // Form (Create): Tạo mới
    WarehouseDTO createWarehouse(WarehouseDTO warehouseDTO);

    // Form (Edit): Cập nhật
    WarehouseDTO updateWarehouse(Integer id, WarehouseDTO warehouseDTO);

    // Table (Delete): Xóa (Soft delete hoặc Hard delete tùy impl)
    void deleteWarehouse(Integer id);

    // Validation: Kiểm tra mã trùng
    boolean checkCodeExists(String code);

    // Dropdown (cho các Form khác như Bin, Inventory): Lấy list kho đang hoạt động
    List<WarehouseDTO> getActiveWarehouses();
}