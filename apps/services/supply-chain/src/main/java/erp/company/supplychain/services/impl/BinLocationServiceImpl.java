package erp.company.supplychain.services.impl;

import erp.company.supplychain.dto.BinLocationDTO;
import erp.company.supplychain.entity.BinLocation;
import erp.company.supplychain.entity.Warehouse;
import erp.company.supplychain.repository.BinLocationRepository;
import erp.company.supplychain.repository.WarehouseRepository;
import erp.company.supplychain.services.BinLocationService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BinLocationServiceImpl implements BinLocationService {

    private final BinLocationRepository binRepository;
    private final WarehouseRepository warehouseRepository;

    @Override
    public Page<BinLocationDTO> getBins(String keyword, Integer warehouseId, Boolean isActive, Pageable pageable) {
        Specification<BinLocation> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(keyword)) {
                predicates.add(cb.like(cb.lower(root.get("binCode")), "%" + keyword.toLowerCase() + "%"));
            }
            if (warehouseId != null) {
                predicates.add(cb.equal(root.get("warehouse").get("warehouseId"), warehouseId));
            }
            // SQL Schema không có cột isActive cho Bin, nhưng FE Form có. 
            // Ta giả định đã thêm cột này trong bước SQL Migration trước đó.
            if (isActive != null) {
                // predicates.add(cb.equal(root.get("isActive"), isActive));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return binRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public BinLocationDTO getBinById(Integer id) {
        BinLocation entity = binRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bin not found"));
        return mapToDTO(entity);
    }

    @Override
    @Transactional
    public BinLocationDTO createBin(BinLocationDTO dto) {
        if (checkBinCodeExists(dto.getWarehouseId(), dto.getBinCode())) {
            throw new RuntimeException("Mã vị trí đã tồn tại trong kho này");
        }
        BinLocation entity = new BinLocation();
        mapToEntity(dto, entity);
        return mapToDTO(binRepository.save(entity));
    }

    @Override
    @Transactional
    public BinLocationDTO updateBin(Integer id, BinLocationDTO dto) {
        BinLocation entity = binRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bin not found"));
        
        // Check duplicate if code or warehouse changed
        boolean changed = !entity.getBinCode().equals(dto.getBinCode()) || 
                          !entity.getWarehouse().getWarehouseId().equals(dto.getWarehouseId());
        
        if (changed && checkBinCodeExists(dto.getWarehouseId(), dto.getBinCode())) {
            throw new RuntimeException("Mã vị trí đã tồn tại trong kho này");
        }

        mapToEntity(dto, entity);
        return mapToDTO(binRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteBin(Integer id) {
        // Hard delete vì thường bin không xóa nếu đã có hàng, 
        // logic check tồn kho nằm ở InventoryService
        binRepository.deleteById(id);
    }

    @Override
    public boolean checkBinCodeExists(Integer warehouseId, String binCode) {
        return binRepository.existsByWarehouse_WarehouseIdAndBinCode(warehouseId, binCode);
    }

    @Override
    public List<BinLocationDTO> getActiveBinsByWarehouse(Integer warehouseId) {
        return binRepository.findByWarehouse_WarehouseId(warehouseId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private BinLocationDTO mapToDTO(BinLocation entity) {
        BinLocationDTO dto = new BinLocationDTO();
        dto.setBinId(entity.getBinId());
        dto.setBinCode(entity.getBinCode());
        dto.setWarehouseId(entity.getWarehouse().getWarehouseId());
        dto.setWarehouseName(entity.getWarehouse().getWarehouseName());
        dto.setMaxCapacity(entity.getMaxCapacity());
        // dto.setIsActive(entity.getIsActive()); // Nếu entity đã cập nhật
        return dto;
    }

    private void mapToEntity(BinLocationDTO dto, BinLocation entity) {
        entity.setBinCode(dto.getBinCode());
        entity.setMaxCapacity(dto.getMaxCapacity());
        
        Warehouse wh = warehouseRepository.findById(dto.getWarehouseId())
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));
        entity.setWarehouse(wh);
        // entity.setIsActive(dto.getIsActive()); // Nếu entity đã cập nhật
    }
}