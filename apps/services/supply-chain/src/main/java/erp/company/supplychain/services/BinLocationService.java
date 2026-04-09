package erp.company.supplychain.services;

import erp.company.supplychain.dto.BinLocationDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface BinLocationService {
    // Table + Filter: Lọc theo kho, từ khóa, trạng thái
    Page<BinLocationDTO> getBins(String keyword, Integer warehouseId, Boolean isActive, Pageable pageable);

    BinLocationDTO getBinById(Integer id);

    BinLocationDTO createBin(BinLocationDTO binDTO);

    BinLocationDTO updateBin(Integer id, BinLocationDTO binDTO);

    void deleteBin(Integer id);

    // Validation: Check trùng mã bin trong cùng 1 kho
    boolean checkBinCodeExists(Integer warehouseId, String binCode);

    // Dropdown (InventoryForm): Lấy bin active theo kho
    List<BinLocationDTO> getActiveBinsByWarehouse(Integer warehouseId);
}