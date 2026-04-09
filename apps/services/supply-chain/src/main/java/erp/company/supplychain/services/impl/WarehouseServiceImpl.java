package erp.company.supplychain.services.impl;

import erp.company.supplychain.dto.WarehouseDTO;
import erp.company.supplychain.entity.Warehouse;
import erp.company.supplychain.entity.enums.WarehouseType;
import erp.company.supplychain.repository.WarehouseRepository;
import erp.company.supplychain.services.WarehouseService;
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
public class WarehouseServiceImpl implements WarehouseService {

    private final WarehouseRepository warehouseRepository;

    @Override
    public Page<WarehouseDTO> getWarehouses(String keyword, String type, Boolean isActive, Pageable pageable) {
        Specification<Warehouse> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (StringUtils.hasText(keyword)) {
                String likePattern = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("warehouseName")), likePattern),
                        cb.like(cb.lower(root.get("warehouseCode")), likePattern),
                        cb.like(cb.lower(root.get("address")), likePattern)
                ));
            }
            if (StringUtils.hasText(type)) {
                predicates.add(cb.equal(root.get("warehouseType"), WarehouseType.valueOf(type)));
            }
            if (isActive != null) {
                predicates.add(cb.equal(root.get("isActive"), isActive));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return warehouseRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public WarehouseDTO getWarehouseById(Integer id) {
        Warehouse entity = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));
        return mapToDTO(entity);
    }

    @Override
    @Transactional
    public WarehouseDTO createWarehouse(WarehouseDTO dto) {
        if (checkCodeExists(dto.getWarehouseCode())) {
            throw new RuntimeException("Mã kho đã tồn tại");
        }
        Warehouse entity = new Warehouse();
        mapToEntity(dto, entity);
        return mapToDTO(warehouseRepository.save(entity));
    }

    @Override
    @Transactional
    public WarehouseDTO updateWarehouse(Integer id, WarehouseDTO dto) {
        Warehouse entity = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));
        
        // Check code uniqueness if changed
        if (!entity.getWarehouseCode().equals(dto.getWarehouseCode()) && checkCodeExists(dto.getWarehouseCode())) {
            throw new RuntimeException("Mã kho đã tồn tại");
        }
        
        mapToEntity(dto, entity);
        return mapToDTO(warehouseRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteWarehouse(Integer id) {
        // Soft delete logic (update isActive) as per FE requirement (though Table shows 'deletedAt')
        // Since SQL schema has isActive, we use that.
        Warehouse entity = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));
        entity.setIsActive(false);
        warehouseRepository.save(entity);
    }

    @Override
    public boolean checkCodeExists(String code) {
        return warehouseRepository.existsByWarehouseCode(code);
    }

    @Override
    public List<WarehouseDTO> getActiveWarehouses() {
        return warehouseRepository.findByIsActiveTrue().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // --- Mappers ---
    private WarehouseDTO mapToDTO(Warehouse entity) {
        WarehouseDTO dto = new WarehouseDTO();
        dto.setWarehouseId(entity.getWarehouseId());
        dto.setWarehouseCode(entity.getWarehouseCode());
        dto.setWarehouseName(entity.getWarehouseName());
        dto.setAddress(entity.getAddress());
        dto.setWarehouseType(entity.getWarehouseType() != null ? entity.getWarehouseType().name() : null);
        dto.setIsActive(entity.getIsActive());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }

    private void mapToEntity(WarehouseDTO dto, Warehouse entity) {
        entity.setWarehouseCode(dto.getWarehouseCode());
        entity.setWarehouseName(dto.getWarehouseName());
        entity.setAddress(dto.getAddress());
        if (StringUtils.hasText(dto.getWarehouseType())) {
            entity.setWarehouseType(WarehouseType.valueOf(dto.getWarehouseType()));
        }
        entity.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
    }
}